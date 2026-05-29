// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MarketFactory
 * @dev Autonomous Prediction Market Protocol on Somnia L1.
 * Supports parimutuel AMM trading, YES/NO liquidity pools, position tracking, and reward claims.
 */
contract MarketFactory {
    enum MarketStatus { ACTIVE, EXPIRED, RESOLVED, DISPUTED }

    struct Market {
        uint256 id;
        string title;
        string category;
        uint256 expiryTimestamp;
        string creator;
        uint256 confidence;
        MarketStatus status;
        bool resolvedOutcome;
        uint256 settlementTimestamp;
        string transactionHash;
        
        // Liquidity and Share Pools
        uint256 totalLiquidity;   // Total funds deposited in native token (wei)
        uint256 yesSharesPool;    // Total YES shares minted
        uint256 noSharesPool;     // Total NO shares minted
    }

    struct Dispute {
        uint256 disputeEndTimestamp;
        uint256 yesVotes;
        uint256 noVotes;
        bool finalized;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => mapping(address => bool)) public disputeVoted;
    mapping(address => bool) public guardians;
    
    uint256 public marketCount;
    address public owner;

    // Position Tracking: MarketId => User => Shares Count
    mapping(uint256 => mapping(address => uint256)) public userYesShares;
    mapping(uint256 => mapping(address => uint256)) public userNoShares;
    mapping(uint256 => mapping(address => bool)) public rewardsClaimed;

    event MarketCreated(uint256 indexed marketId, string title, uint256 expiryTimestamp);
    event MarketExpired(uint256 indexed marketId);
    event MarketResolved(uint256 indexed marketId, bool outcome, uint256 settlementTimestamp);
    event MarketDisputed(uint256 indexed marketId, uint256 disputeEndTimestamp);
    event DisputeVoteCast(uint256 indexed marketId, address indexed voter, bool vote, uint256 weight);
    event DisputeFinalized(uint256 indexed marketId, bool finalOutcome);
    
    // Trading Events
    event TradeExecuted(
        uint256 indexed marketId, 
        address indexed trader, 
        bool position, // true = YES, false = NO
        uint256 amountSpent, 
        uint256 sharesMinted,
        uint256 newYesOdds,
        uint256 newNoOdds
    );
    event PositionUpdated(uint256 indexed marketId, address indexed trader, uint256 yesShares, uint256 noShares);
    event RewardsClaimed(uint256 indexed marketId, address indexed claimant, uint256 amountClaimed);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
        guardians[msg.sender] = true; // Owner is default guardian
    }

    /**
     * @dev Creates a new prediction market on-chain.
     */
    function createMarket(
        string memory _title, 
        string memory _category, 
        uint256 _expiry,
        string memory _creator,
        uint256 _confidence
    ) external onlyOwner returns (uint256) {
        marketCount++;
        
        uint256 finalExpiry = _expiry > 1000000000 ? _expiry : (block.timestamp + _expiry);
        
        markets[marketCount] = Market({
            id: marketCount,
            title: _title,
            category: _category,
            expiryTimestamp: finalExpiry,
            creator: _creator,
            confidence: _confidence,
            status: MarketStatus.ACTIVE,
            resolvedOutcome: false,
            settlementTimestamp: 0,
            transactionHash: "",
            totalLiquidity: 0,
            yesSharesPool: 0,
            noSharesPool: 0
        });

        emit MarketCreated(marketCount, _title, finalExpiry);
        return marketCount;
    }

    /**
     * @dev Scans and transitions expired markets from ACTIVE to EXPIRED.
     */
    function closeExpiredMarkets() public {
        for (uint256 i = 1; i <= marketCount; i++) {
            if (markets[i].status == MarketStatus.ACTIVE && block.timestamp >= markets[i].expiryTimestamp) {
                markets[i].status = MarketStatus.EXPIRED;
                emit MarketExpired(i);
            }
        }
    }

    /**
     * @dev Resolves a market with a YES (true) or NO (false) outcome.
     */
    function resolveMarket(uint256 marketId, bool outcome) external onlyOwner {
        require(markets[marketId].id != 0, "Market does not exist");
        require(
            markets[marketId].status == MarketStatus.ACTIVE || 
            markets[marketId].status == MarketStatus.EXPIRED, 
            "Market already resolved"
        );
        
        markets[marketId].status = MarketStatus.RESOLVED;
        markets[marketId].resolvedOutcome = outcome;
        markets[marketId].settlementTimestamp = block.timestamp;

        emit MarketResolved(marketId, outcome, block.timestamp);
    }

    /**
     * @dev Allows anyone who holds shares in a resolved market to dispute the outcome.
     * Transitions status to DISPUTED and starts a 24-hour dispute resolution voting window.
     */
    function disputeMarket(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market does not exist");
        require(market.status == MarketStatus.RESOLVED, "Market must be resolved to dispute");
        require(block.timestamp <= market.settlementTimestamp + 1 days, "Dispute window expired");
        
        uint256 callerShares = userYesShares[marketId][msg.sender] + userNoShares[marketId][msg.sender];
        require(callerShares > 0 || msg.sender == owner || guardians[msg.sender], "Must hold shares or be guardian to dispute");

        market.status = MarketStatus.DISPUTED;
        
        Dispute storage dispute = disputes[marketId];
        dispute.disputeEndTimestamp = block.timestamp + 1 days;
        dispute.yesVotes = 0;
        dispute.noVotes = 0;
        dispute.finalized = false;

        emit MarketDisputed(marketId, dispute.disputeEndTimestamp);
    }

    /**
     * @dev Allows users to cast dispute votes, weighted by their total YES and NO shares owned.
     */
    function voteOnDispute(uint256 marketId, bool voteOutcome) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.DISPUTED, "Market is not in dispute");
        require(block.timestamp < disputes[marketId].disputeEndTimestamp, "Dispute voting window closed");
        require(!disputeVoted[marketId][msg.sender], "Already voted on this dispute");

        uint256 weight = userYesShares[marketId][msg.sender] + userNoShares[marketId][msg.sender];
        if (weight == 0) {
            weight = 1; // Fallback minimum weight for governance participants
        }

        disputeVoted[marketId][msg.sender] = true;
        if (voteOutcome) {
            disputes[marketId].yesVotes += weight;
        } else {
            disputes[marketId].noVotes += weight;
        }

        emit DisputeVoteCast(marketId, msg.sender, voteOutcome, weight);
    }

    /**
     * @dev Finalizes the dispute, setting the final outcome based on consensus.
     */
    function finalizeDispute(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.DISPUTED, "Market is not in dispute");
        
        Dispute storage dispute = disputes[marketId];
        require(block.timestamp >= dispute.disputeEndTimestamp || msg.sender == owner || guardians[msg.sender], "Voting window still open");
        require(!dispute.finalized, "Dispute already finalized");

        dispute.finalized = true;
        
        // Determine consensus outcome (defaulting to YES if votes are equal)
        bool finalOutcome = dispute.yesVotes >= dispute.noVotes;
        
        market.status = MarketStatus.RESOLVED;
        market.resolvedOutcome = finalOutcome;
        market.settlementTimestamp = block.timestamp;

        emit DisputeFinalized(marketId, finalOutcome);
        emit MarketResolved(marketId, finalOutcome, block.timestamp);
    }

    /**
     * @dev Multi-sig / Guardian emergency settlement override.
     */
    function addGuardian(address _guardian) external onlyOwner {
        guardians[_guardian] = true;
    }

    function removeGuardian(address _guardian) external onlyOwner {
        guardians[_guardian] = false;
    }

    function emergencyResolveMarket(uint256 marketId, bool outcome) external {
        require(msg.sender == owner || guardians[msg.sender], "Only owner or guardians can override");
        require(markets[marketId].id != 0, "Market does not exist");
        
        markets[marketId].status = MarketStatus.RESOLVED;
        markets[marketId].resolvedOutcome = outcome;
        markets[marketId].settlementTimestamp = block.timestamp;

        emit MarketResolved(marketId, outcome, block.timestamp);
    }

    /**
     * @dev Purchase YES or NO shares in a prediction market using msg.value.
     * Position: true = YES, false = NO.
     */
    function buyShares(uint256 marketId, bool position) external payable {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market does not exist");
        require(market.status == MarketStatus.ACTIVE, "Market is not active");
        require(msg.value > 0, "Must send value to buy shares");

        // Calculate initial odds ratio
        // If pools are empty, initialize odds at 50/50 (0.5)
        uint256 yesOdds = getOdds(marketId, true);
        
        uint256 sharesMinted;
        if (position) {
            // YES Position
            sharesMinted = (msg.value * 100) / yesOdds;
            userYesShares[marketId][msg.sender] += sharesMinted;
            market.yesSharesPool += sharesMinted;
        } else {
            // NO Position
            uint256 noOdds = 100 - yesOdds;
            sharesMinted = (msg.value * 100) / noOdds;
            userNoShares[marketId][msg.sender] += sharesMinted;
            market.noSharesPool += sharesMinted;
        }

        market.totalLiquidity += msg.value;

        // Recalculate dynamic odds after liquidity shift
        uint256 finalYesOdds = getOdds(marketId, true);
        uint256 finalNoOdds = 100 - finalYesOdds;

        emit TradeExecuted(
            marketId, 
            msg.sender, 
            position, 
            msg.value, 
            sharesMinted,
            finalYesOdds,
            finalNoOdds
        );
        
        emit PositionUpdated(
            marketId, 
            msg.sender, 
            userYesShares[marketId][msg.sender], 
            userNoShares[marketId][msg.sender]
        );
    }

    /**
     * @dev Sells owned shares back to the liquidity pool prior to expiry.
     */
    function sellShares(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market does not exist");
        require(market.status == MarketStatus.ACTIVE, "Market is not active");

        uint256 yesShares = userYesShares[marketId][msg.sender];
        uint256 noShares = userNoShares[marketId][msg.sender];
        require(yesShares > 0 || noShares > 0, "No shares to sell");

        uint256 refundAmount = 0;
        uint256 yesOdds = getOdds(marketId, true);
        uint256 noOdds = 100 - yesOdds;

        if (yesShares > 0) {
            refundAmount += (yesShares * yesOdds) / 100;
            market.yesSharesPool -= yesShares;
            userYesShares[marketId][msg.sender] = 0;
        }

        if (noShares > 0) {
            refundAmount += (noShares * noOdds) / 100;
            market.noSharesPool -= noShares;
            userNoShares[marketId][msg.sender] = 0;
        }

        // Apply a small 2% fee to maintain AMM balance health
        uint256 fee = (refundAmount * 2) / 100;
        refundAmount -= fee;

        require(market.totalLiquidity >= refundAmount, "Insufficient liquidity in pool");
        market.totalLiquidity -= refundAmount;

        // Refund the trader in native coin
        payable(msg.sender).transfer(refundAmount);

        emit PositionUpdated(marketId, msg.sender, 0, 0);
    }

    /**
     * @dev Claims the winnings payout for a resolved market.
     */
    function claimRewards(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.RESOLVED, "Market not resolved yet");
        require(!rewardsClaimed[marketId][msg.sender], "Winnings already claimed");

        bool winnerOutcome = market.resolvedOutcome;
        uint256 winningShares = winnerOutcome ? userYesShares[marketId][msg.sender] : userNoShares[marketId][msg.sender];
        require(winningShares > 0, "You do not own winning shares");

        uint256 totalWinningPool = winnerOutcome ? market.yesSharesPool : market.noSharesPool;
        require(totalWinningPool > 0, "Invalid winning pool state");

        // Reward formula: (userWinningShares / totalWinningShares) * totalLiquidity
        uint256 rewardAmount = (winningShares * market.totalLiquidity) / totalWinningPool;
        
        rewardsClaimed[marketId][msg.sender] = true;
        
        // Zero out user shares to prevent double-claiming
        userYesShares[marketId][msg.sender] = 0;
        userNoShares[marketId][msg.sender] = 0;

        // Transfer reward payout
        payable(msg.sender).transfer(rewardAmount);

        emit RewardsClaimed(marketId, msg.sender, rewardAmount);
        emit PositionUpdated(marketId, msg.sender, 0, 0);
    }

    /**
     * @dev Helper to calculate current YES/NO probability odds (scaled 1-99).
     */
    function getOdds(uint256 marketId, bool position) public view returns (uint256) {
        Market storage market = markets[marketId];
        if (market.yesSharesPool == 0 && market.noSharesPool == 0) {
            return 50; // Initial 50/50 odds
        }

        uint256 totalShares = market.yesSharesPool + market.noSharesPool;
        uint256 yesOdds = (market.yesSharesPool * 100) / totalShares;
        
        // Boundaries protection (keep odds bounded between 5% and 95% to avoid absolute curves)
        if (yesOdds < 5) yesOdds = 5;
        if (yesOdds > 95) yesOdds = 95;

        return position ? yesOdds : (100 - yesOdds);
    }
}
