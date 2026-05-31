import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("MarketFactory", function () {
  let MarketFactory, marketFactory, owner, addr1, addr2, oracle;

  beforeEach(async function () {
    [owner, addr1, addr2, oracle] = await ethers.getSigners();

    MarketFactory = await ethers.getContractFactory("MarketFactory");
    marketFactory = await MarketFactory.deploy();
  });

  it("Should create a new market successfully", async function () {
    const createTx = await marketFactory.createMarket(
      "Will STT hit $10?",
      "Crypto",
      "MacroAgent",
      Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
      85
    );
    await createTx.wait();

    const market = await marketFactory.markets(1);
    expect(market.title).to.equal("Will STT hit $10?");
  });

  it("Should allow users to buy YES shares", async function () {
    await marketFactory.createMarket("Will STT hit $10?", "Crypto", "MacroAgent", Math.floor(Date.now() / 1000) + 3600, 85);
    
    const depositAmount = ethers.parseEther("1.0");
    await marketFactory.connect(addr1).buyShares(1, true, { value: depositAmount });

    const pool = await marketFactory.pools(1);
    expect(pool.yesShares).to.be.gt(0);
  });

  it("Should resolve market successfully", async function () {
    await marketFactory.createMarket("Will STT hit $10?", "Crypto", "MacroAgent", Math.floor(Date.now() / 1000) + 3600, 85);
    
    await marketFactory.resolveMarket(1, true); // true = YES wins
    
    const market = await marketFactory.markets(1);
    expect(market.status).to.equal(2); // 2 = RESOLVED
    expect(market.resolvedOutcome).to.equal(true);
  });
});
