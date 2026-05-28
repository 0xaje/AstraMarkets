// AstraMarkets Terminal Terra v1.0 - Application Core Brain
// Implements active state management, simulation engine, and interactive components

// --- GLOBAL STATE ---
const state = {
    theme: 'light',
    wallet: {
        isConnected: true,
        address: '0x78aF92C3D3a5C9f83a48e7B1D0b2C34566E7662e',
        balance: 1230.00,
        lockedBalance: 250.00,
        get netWorth() {
            return this.balance + this.lockedBalance;
        }
    },
    activeTab: 'feed',
    simulationSpeed: 1, // 1x, 2x, 5x
    autoTrade: true,
    autoMarket: true,
    activeAgentsCount: 4,
    
    // Active Prediction Markets
    markets: [
        {
            id: 'm1',
            title: 'ETH ETF Momentum Spike',
            category: 'crypto',
            badge: 'Crypto Architecture',
            statusText: 'Growth Surge',
            ref: '#4829-X',
            description: 'Heavy institutional flows detected in offshore derivatives. Cross-chain liquidity maps suggest early positioning for ETF final approval cycle.',
            confidence: 88,
            yesOdds: 0.54,
            noOdds: 0.46,
            volume: 14200.00,
            change: '+6.8%',
            agent: 'MacroAgent',
            theme: 'primary',
            history: [0.45, 0.47, 0.49, 0.52, 0.50, 0.54],
            isSimulated: false
        },
        {
            id: 'm2',
            title: 'Global Semis Supply Chain Shift',
            category: 'macro',
            badge: 'Macro Ecosystem',
            statusText: 'Steady Flow',
            ref: '#5102-M',
            description: 'Satellite imaging shows decreased port activity in TPE container terminals. Regional stability index holding but trade velocity is decelerating.',
            confidence: 64,
            yesOdds: 0.38,
            noOdds: 0.62,
            volume: 8900.00,
            change: '-2.4%',
            agent: 'MacroAgent',
            theme: 'secondary',
            history: [0.42, 0.41, 0.40, 0.39, 0.37, 0.38],
            isSimulated: false
        },
        {
            id: 'm3',
            title: 'Somnia L1 TVL Surge Acceleration',
            category: 'crypto',
            badge: 'Crypto Architecture',
            statusText: 'Golden Yield',
            ref: '#9228-S',
            description: 'Hyper-scalable EVM gas mechanics attracting multi-chain yield aggregators. Sub-second block consensus triggers automated TVL migrations.',
            confidence: 94,
            yesOdds: 0.72,
            noOdds: 0.28,
            volume: 24500.00,
            change: '+15.2%',
            agent: 'RiskAgent',
            theme: 'tertiary',
            history: [0.55, 0.60, 0.62, 0.68, 0.70, 0.72],
            isSimulated: false
        },
        {
            id: 'm4',
            title: 'NVIDIA vs Apple Q3 AI Compute War',
            category: 'tech',
            badge: 'Compute Architecture',
            statusText: 'Growth Surge',
            ref: '#7730-C',
            description: 'B200 architecture yield rates outperforming initial guidance. Demand parameters for decentralized LLM fine-tuning clusters spiking globally.',
            confidence: 76,
            yesOdds: 0.58,
            noOdds: 0.42,
            volume: 18400.00,
            change: '+8.1%',
            agent: 'SocialAgent',
            theme: 'secondary',
            history: [0.50, 0.52, 0.55, 0.53, 0.56, 0.58],
            isSimulated: false
        }
    ],
    
    // AI Agents
    agents: [
        {
            name: 'EcoAgent',
            strategy: 'Ecology Sentiment Integration',
            target: 'Global Semis Supply Chain Shift',
            capital: 150,
            accuracy: 74,
            trades: 98,
            status: 'Mapping global shipping latency data...',
            color: 'primary'
        },
        {
            name: 'SocialAgent',
            strategy: 'Viral Index Extraction',
            target: 'NVIDIA vs Apple Q3 AI Compute War',
            capital: 200,
            accuracy: 81,
            trades: 115,
            status: 'Monitoring Reddit GPU scraping feeds...',
            color: 'secondary'
        },
        {
            name: 'MacroAgent',
            strategy: 'Offshore Liquidity Analysis',
            target: 'ETH ETF Momentum Spike',
            capital: 350,
            accuracy: 86,
            trades: 142,
            status: 'Scanning macro yield curves...',
            color: 'primary'
        },
        {
            name: 'RiskAgent',
            strategy: 'Dynamic Volatility Arbitrage',
            target: 'Somnia L1 TVL Surge Acceleration',
            capital: 400,
            accuracy: 92,
            trades: 184,
            status: 'Calibrating cross-chain TVL maps...',
            color: 'tertiary'
        }
    ],
    
    // User Active Positions
    positions: [
        {
            id: 'p1',
            marketId: 'm3',
            marketTitle: 'Somnia L1 TVL Surge Acceleration',
            side: 'YES',
            shares: 200,
            avgPrice: 0.65,
            currentPrice: 0.72,
            get invested() { return this.shares * this.avgPrice; },
            get value() { return this.shares * this.currentPrice; },
            get pnl() { return this.value - this.invested; }
        },
        {
            id: 'p2',
            marketId: 'm1',
            marketTitle: 'ETH ETF Momentum Spike',
            side: 'YES',
            shares: 222.22,
            avgPrice: 0.54,
            currentPrice: 0.54,
            get invested() { return this.shares * this.avgPrice; },
            get value() { return this.shares * this.currentPrice; },
            get pnl() { return this.value - this.invested; }
        }
    ],
    
    // Ledger System Transactions
    transactions: [
        {
            hash: '0x8ae43d8a7c29fb2c846d0a7977463f23a41761e2',
            action: 'Prediction Contract Execution',
            sender: '0x78aF92C3D3...662e',
            details: 'Purchased 222.22 YES shares of ETH ETF Momentum Spike at 0.54 SOM',
            timestamp: '12s ago'
        },
        {
            hash: '0x9d4a8e32c02111ef8e0a8ffde32b0a79cfc8e2bd',
            action: 'AI Agent Deployment',
            sender: '0x78aF92C3D3...662e',
            details: 'Successfully deployed RiskAgent on Somnia L1 smart contract protocol',
            timestamp: '5m ago'
        },
        {
            hash: '0x7fc20d881a29f8f2b2c8a221f2988f0a0cde198d',
            action: 'Oracle Consensus Update',
            sender: 'AstraDeployer',
            details: 'Somnia L1 TVL market resolved price to 0.72 YES',
            timestamp: '12m ago'
        },
        {
            hash: '0x32ae202111a886fde32b0a79cfc8e2bd8a7c29fb',
            action: 'Faucet Testnet Claim',
            sender: '0x78aF92C3D3...662e',
            details: 'Minted +100.00 SOM from Somnia faucet validator',
            timestamp: '25m ago'
        }
    ],
    
    // AI Consciousness log queue
    consciousnessLogs: [
        { text: "MacroAgent scanning global news...", color: "primary", age: "1s ago" },
        { text: "SocialAgent detecting viral spike on Reddit...", color: "secondary", age: "5s ago" },
        { text: "RiskAgent adjusting volatility score...", color: "tertiary", age: "12s ago" }
    ],
    
    // Active Right Decision Box State
    rootedDecision: {
        text: "Should we open a market on Somnia L1 Gas Token Arbitrage?",
        yesVotes: 68,
        noVotes: 32,
        hasVoted: false
    },
    
    // Drawer Context for trade operations
    drawerContext: {
        marketId: null,
        side: 'YES'
    }
};

// --- LOCAL STORAGE PERSISTENCE SYSTEM ---
function saveStateToLocalStorage() {
    try {
        const stateToSave = {
            theme: state.theme,
            wallet: {
                isConnected: state.wallet.isConnected,
                address: state.wallet.address,
                balance: state.wallet.balance,
                lockedBalance: state.wallet.lockedBalance
            },
            simulationSpeed: state.simulationSpeed,
            autoTrade: state.autoTrade,
            autoMarket: state.autoMarket,
            activeAgentsCount: state.activeAgentsCount,
            markets: state.markets,
            agents: state.agents,
            positions: state.positions.map(p => ({
                id: p.id,
                marketId: p.marketId,
                marketTitle: p.marketTitle,
                side: p.side,
                shares: p.shares,
                avgPrice: p.avgPrice,
                currentPrice: p.currentPrice
            })),
            transactions: state.transactions,
            consciousnessLogs: state.consciousnessLogs
        };
        localStorage.setItem('astramarkets_state', JSON.stringify(stateToSave));
    } catch (e) {
        console.error("Error saving state to localStorage", e);
    }
}

function loadStateFromLocalStorage() {
    const savedState = localStorage.getItem('astramarkets_state');
    if (!savedState) return;
    
    try {
        const parsed = JSON.parse(savedState);
        if (parsed.theme) state.theme = parsed.theme;
        if (parsed.wallet) {
            state.wallet.isConnected = parsed.wallet.isConnected;
            state.wallet.address = parsed.wallet.address;
            state.wallet.balance = parsed.wallet.balance;
            state.wallet.lockedBalance = parsed.wallet.lockedBalance;
        }
        if (parsed.simulationSpeed) state.simulationSpeed = parsed.simulationSpeed;
        if (parsed.autoTrade !== undefined) state.autoTrade = parsed.autoTrade;
        if (parsed.autoMarket !== undefined) state.autoMarket = parsed.autoMarket;
        if (parsed.activeAgentsCount) state.activeAgentsCount = parsed.activeAgentsCount;
        
        if (parsed.markets) state.markets = parsed.markets;
        if (parsed.agents) state.agents = parsed.agents;
        
        if (parsed.positions) {
            state.positions = parsed.positions.map(p => ({
                id: p.id,
                marketId: p.marketId,
                marketTitle: p.marketTitle,
                side: p.side,
                shares: p.shares,
                avgPrice: p.avgPrice,
                currentPrice: p.currentPrice,
                get invested() { return this.shares * this.avgPrice; },
                get value() { return this.shares * this.currentPrice; },
                get pnl() { return this.value - this.invested; }
            }));
        }
        if (parsed.transactions) state.transactions = parsed.transactions;
        if (parsed.consciousnessLogs) state.consciousnessLogs = parsed.consciousnessLogs;
        
    } catch (e) {
        console.error("Error loading state from localStorage", e);
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadStateFromLocalStorage();
    initTheme();
    setupNavigation();
    setupEventHandlers();
    setupSimulation();
    renderAll();
    
    // Render first log entries immediately
    renderConsciousnessLogs();
});

// --- THEME SYSTEM ---
function initTheme() {
    const savedTheme = localStorage.getItem('astra-theme') || 'light';
    setTheme(savedTheme);
    
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
        const nextTheme = state.theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
    });
}

function setTheme(theme) {
    state.theme = theme;
    localStorage.setItem('astra-theme', theme);
    saveStateToLocalStorage();
    
    const htmlElement = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    
    if (theme === 'dark') {
        htmlElement.classList.add('dark');
        htmlElement.classList.remove('light');
        themeIcon.textContent = 'light_mode';
    } else {
        htmlElement.classList.add('light');
        htmlElement.classList.remove('dark');
        themeIcon.textContent = 'dark_mode';
    }
}

// --- NAVIGATION SYSTEM ---
function setupNavigation() {
    const navButtons = document.querySelectorAll('aside nav button');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            navButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.page-tab').forEach(p => p.classList.remove('active'));
            
            // Set active navigation button
            btn.classList.add('active');
            
            // Activate corresponding tab page
            const tabId = btn.getAttribute('data-tab');
            state.activeTab = tabId;
            const targetPage = document.getElementById(`tab-${tabId}`);
            if (targetPage) {
                targetPage.classList.add('active');
            }
            
            // Re-render specifics if needed
            if (tabId === 'portfolio') {
                renderPortfolio();
            } else if (tabId === 'markets') {
                renderMarkets();
            } else if (tabId === 'agents') {
                renderAgentLab();
            } else if (tabId === 'activity') {
                renderActivityLedger();
            } else if (tabId === 'feed') {
                renderFeed();
            }
            
            // Hide notification badge on feed click if it was showing
            if (tabId === 'feed') {
                document.getElementById('feed-notif').classList.add('hidden');
            }
        });
    });
    
    // Logo and Brand Header click resets back to Feed
    const logoButton = document.getElementById('logo-button');
    const brandHeader = document.getElementById('brand-header');
    const resetToFeed = () => {
        const feedBtn = document.getElementById('nav-feed');
        if (feedBtn) feedBtn.click();
    };
    if (logoButton) logoButton.addEventListener('click', resetToFeed);
    if (brandHeader) brandHeader.addEventListener('click', resetToFeed);
}

// --- EVENT HANDLERS ---
function setupEventHandlers() {
    // Faucet Modal Triggers
    const walletConnectBtn = document.getElementById('wallet-connect-btn');
    const walletModal = document.getElementById('wallet-modal');
    const walletClose = document.getElementById('wallet-modal-close');
    
    const openWallet = () => {
        walletModal.classList.add('open');
        renderWalletModal();
    };
    
    walletConnectBtn.addEventListener('click', openWallet);
    walletClose.addEventListener('click', () => walletModal.classList.remove('open'));
    
    // Faucet Mint Action
    const faucetBtn = document.getElementById('wallet-faucet-btn');
    faucetBtn.addEventListener('click', executeFaucetMint);
    
    // Settings Modal Triggers
    const settingsBtn = document.getElementById('nav-settings');
    const synapticBtn = document.getElementById('synaptic-load-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsClose = document.getElementById('settings-modal-close');
    
    const openSettings = () => settingsModal.classList.add('open');
    settingsBtn.addEventListener('click', openSettings);
    synapticBtn.addEventListener('click', openSettings);
    settingsClose.addEventListener('click', () => settingsModal.classList.remove('open'));
    
    // Simulation Speed Control buttons
    const speedButtons = document.querySelectorAll('.speed-btn');
    speedButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            speedButtons.forEach(b => b.classList.remove('active', 'bg-surface-solid', 'shadow', 'text-primary'));
            speedButtons.forEach(b => b.classList.add('text-outline'));
            
            btn.classList.remove('text-outline');
            btn.classList.add('active', 'bg-surface-solid', 'shadow', 'text-primary');
            
            state.simulationSpeed = parseInt(btn.getAttribute('data-speed'));
            addConsciousnessLog(`System clock speed throttled to ${state.simulationSpeed}x velocity.`, 'tertiary');
            saveStateToLocalStorage();
        });
    });
    
    // Settings toggles
    document.getElementById('settings-auto-trade').addEventListener('change', (e) => {
        state.autoTrade = e.target.checked;
        addConsciousnessLog(`Autonomous background trading engine set to: ${state.autoTrade ? 'ACTIVE' : 'DEACTIVATED'}.`, 'secondary');
        saveStateToLocalStorage();
    });
    document.getElementById('settings-auto-market').addEventListener('change', (e) => {
        state.autoMarket = e.target.checked;
        addConsciousnessLog(`Autonomous prediction market creation set to: ${state.autoMarket ? 'ACTIVE' : 'DEACTIVATED'}.`, 'secondary');
        saveStateToLocalStorage();
    });
    
    // Filter Feed Buttons
    const filterButtons = document.querySelectorAll('.feed-filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => {
                b.classList.remove('text-primary', 'border-primary');
                b.classList.add('text-outline', 'border-transparent');
            });
            btn.classList.remove('text-outline', 'border-transparent');
            btn.classList.add('text-primary', 'border-primary');
            
            const category = btn.getAttribute('data-feed-filter');
            renderFeed(category);
        });
    });
    
    // Markets search and select filters
    document.getElementById('market-search').addEventListener('input', () => renderMarkets());
    document.getElementById('market-category').addEventListener('change', () => renderMarkets());
    
    // Creator Lab deploy action
    document.getElementById('deploy-agent-btn').addEventListener('click', deployNewAgent);
    document.getElementById('deploy-agent-capital').addEventListener('input', (e) => {
        document.getElementById('deploy-capital-value').textContent = `${e.target.value} SOM`;
    });
    
    // Drawer Actions
    const drawer = document.getElementById('insight-drawer');
    const drawerClose = document.getElementById('insight-close');
    drawerClose.addEventListener('click', () => drawer.classList.remove('open'));
    
    // YES/NO prediction select in drawer
    const buyYesBtn = document.getElementById('trade-side-yes');
    const buyNoBtn = document.getElementById('trade-side-no');
    
    buyYesBtn.addEventListener('click', () => {
        buyYesBtn.className = "flex-1 py-2.5 rounded-lg bg-surface-solid shadow text-primary font-bold uppercase text-xs flex items-center justify-center gap-1.5 transition-all";
        buyNoBtn.className = "flex-1 py-2.5 rounded-lg text-outline hover:text-error font-bold uppercase text-xs flex items-center justify-center gap-1.5 transition-all";
        state.drawerContext.side = 'YES';
        calculateEstShares();
    });
    
    buyNoBtn.addEventListener('click', () => {
        buyNoBtn.className = "flex-1 py-2.5 rounded-lg bg-surface-solid shadow text-error font-bold uppercase text-xs flex items-center justify-center gap-1.5 transition-all";
        buyYesBtn.className = "flex-1 py-2.5 rounded-lg text-outline hover:text-primary font-bold uppercase text-xs flex items-center justify-center gap-1.5 transition-all";
        state.drawerContext.side = 'NO';
        calculateEstShares();
    });
    
    document.getElementById('trade-amount').addEventListener('input', calculateEstShares);
    
    // Authorize prediction contract click
    document.getElementById('trade-submit-btn').addEventListener('click', executeTradePrediction);
    
    // Right panel Cognitive logs vs Chat switcher
    const logTabBtn = document.getElementById('cog-tab-logs');
    const chatTabBtn = document.getElementById('cog-tab-chat');
    const logPanelView = document.getElementById('consciousness-logs-panel');
    const chatPanelView = document.getElementById('consciousness-chat-panel');
    
    logTabBtn.addEventListener('click', () => {
        logTabBtn.className = "px-2.5 py-1 rounded bg-surface-solid shadow text-primary font-extrabold cursor-pointer transition-all";
        chatTabBtn.className = "px-2.5 py-1 rounded text-outline hover:text-primary cursor-pointer transition-all";
        logPanelView.classList.remove('hidden');
        chatPanelView.classList.add('hidden');
    });
    
    chatTabBtn.addEventListener('click', () => {
        chatTabBtn.className = "px-2.5 py-1 rounded bg-surface-solid shadow text-primary font-extrabold cursor-pointer transition-all";
        logTabBtn.className = "px-2.5 py-1 rounded text-outline hover:text-primary cursor-pointer transition-all";
        chatPanelView.classList.remove('hidden');
        logPanelView.classList.add('hidden');
        
        // Scroll messages to bottom
        setTimeout(() => {
            const container = document.getElementById('chat-messages-container');
            container.scrollTop = container.scrollHeight;
        }, 100);
    });
    
    // Chat Send message
    document.getElementById('hive-chat-send').addEventListener('click', sendHiveChatMessage);
    document.getElementById('hive-chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendHiveChatMessage();
    });
    
    // Rooted Decision Vote Buttons
    document.getElementById('vote-yes-btn').addEventListener('click', () => executeGovernanceVote('YES'));
    document.getElementById('vote-no-btn').addEventListener('click', () => executeGovernanceVote('NO'));
    
    // Activity ledger clear button
    document.getElementById('clear-activity-btn').addEventListener('click', () => {
        state.transactions = [];
        renderActivityLedger();
        addConsciousnessLog("Platform blockchain transaction cache flushed by user.", "secondary");
    });
}

// --- MOUSE TRACKING GLOW ---
// Dynamic glassmorphic highlight following mouse coordinate inside cosmic-cards
function applyCardGlowEffects() {
    document.querySelectorAll('.cosmic-card').forEach(card => {
        // Only attach if not already configured
        if (!card.dataset.glowConfigured) {
            card.classList.add('cosmic-card-interactive');
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--x', `${x}px`);
                card.style.setProperty('--y', `${y}px`);
            });
            card.dataset.glowConfigured = "true";
        }
    });
}

// --- RENDERERS ---

function renderAll() {
    renderHeaders();
    renderFeed();
    renderMarkets();
    renderAgentLab();
    renderPortfolio();
    renderActivityLedger();
    applyCardGlowEffects();
}

function renderHeaders() {
    // Wallet Status
    const btnText = document.getElementById('wallet-btn-text');
    btnText.textContent = `${state.wallet.balance.toFixed(2)} SOM`;
    
    // Active counts
    document.getElementById('active-agents-count').textContent = state.agents.length;
}

// Tab 1: Feed (Astra Stream)
function renderFeed(filter = 'all') {
    const container = document.getElementById('feed-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    let filteredMarkets = state.markets;
    if (filter !== 'all') {
        filteredMarkets = state.markets.filter(m => m.category === filter);
    }
    
    filteredMarkets.forEach((market, index) => {
        const article = document.createElement('article');
        article.className = 'cosmic-card p-8 rounded-xl relative overflow-hidden group cursor-pointer';
        article.style.animationDelay = `${index * 0.1}s`;
        
        // Colors mapping
        let colorTheme = market.theme || (market.agent === 'EcoAgent' || market.agent === 'MacroAgent' ? 'primary' : 
                         market.agent === 'SocialAgent' ? 'secondary' : 'tertiary');
        
        const strokeDashoffset = 175 - (175 * market.confidence / 100);
        
        article.innerHTML = `
            <div class="absolute bottom-0 left-0 w-full h-1.5 bg-${colorTheme}/30 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]"></div>
            <div class="flex justify-between items-start mb-6">
                <div>
                    <span class="px-2.5 py-1 bg-surface-container-highest rounded text-[10px] font-label font-bold text-on-surface-variant border border-outline-variant/40 uppercase tracking-wider">${market.badge}</span>
                    <h3 class="font-headline text-2xl mt-3 text-on-surface font-bold group-hover:text-${colorTheme} transition-colors">${market.title}</h3>
                </div>
                <div class="text-right">
                    <span class="block font-label text-${colorTheme} text-xs font-bold uppercase tracking-widest">${market.statusText}</span>
                    <span class="block font-label text-outline text-[10px] mt-1">LOG: ${market.ref}</span>
                </div>
            </div>
            
            <div class="flex items-center gap-10 mb-6">
                <div class="flex-1">
                    <p class="font-body text-on-surface-variant leading-relaxed text-sm">
                        ${market.description}
                    </p>
                </div>
                <div class="flex flex-col items-center shrink-0">
                    <div class="relative w-16 h-16 flex items-center justify-center rounded-full bg-surface-container/10">
                        <svg class="w-16 h-16 transform -rotate-90">
                            <circle class="text-surface-variant/40 dark:text-zinc-800" cx="32" cy="32" fill="transparent" r="28" stroke="currentColor" stroke-width="4"></circle>
                            <circle class="text-${colorTheme} confidence-circle" cx="32" cy="32" fill="transparent" r="28" stroke="currentColor" 
                                    stroke-dasharray="175" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" stroke-width="4"></circle>
                        </svg>
                        <span class="absolute font-label text-sm font-bold text-${colorTheme}">${market.confidence}%</span>
                    </div>
                    <span class="font-label text-[10px] text-outline mt-2 uppercase tracking-tighter">Confidence</span>
                </div>
            </div>
            
            <div class="flex justify-between items-center pt-5 border-t border-outline-variant/20">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-base text-${colorTheme}">psychology</span>
                    <span class="font-label text-xs text-on-surface-variant">Observer: ${market.agent}</span>
                </div>
                <div class="flex gap-1">
                    <div class="led-segment bg-${colorTheme} animate-led-pulse" style="animation-delay: 0.1s"></div>
                    <div class="led-segment bg-${colorTheme} animate-led-pulse" style="animation-delay: 0.2s"></div>
                    <div class="led-segment bg-${colorTheme} animate-led-pulse" style="animation-delay: 0.3s"></div>
                    <div class="led-segment ${market.confidence > 75 ? 'bg-' + colorTheme : 'bg-outline-variant'} ${market.confidence > 75 ? 'animate-led-pulse' : ''}" style="animation-delay: 0.4s"></div>
                    <div class="led-segment ${market.confidence > 90 ? 'bg-' + colorTheme : 'bg-outline-variant'} ${market.confidence > 90 ? 'animate-led-pulse' : ''}"></div>
                </div>
            </div>
        `;
        
        // Clicking open drawer
        article.addEventListener('click', () => openInsightDrawer(market.id));
        container.appendChild(article);
    });
    
    // Add default Scanning/Loading State Card
    const loadingCard = document.createElement('article');
    loadingCard.className = 'cosmic-card p-6 rounded-2xl relative overflow-hidden opacity-70 border-dashed border-2 border-outline-variant/40';
    loadingCard.innerHTML = `
        <div class="h-24 flex items-center justify-center flex-col gap-3">
            <span class="material-symbols-outlined animate-spin text-primary/60">eco</span>
            <span class="font-label text-xs text-outline uppercase tracking-widest font-bold">Scanning Terrestrial Data...</span>
        </div>
    `;
    container.appendChild(loadingCard);
    
    applyCardGlowEffects();
}

// Tab 2: Prediction Markets
function renderMarkets() {
    const container = document.getElementById('markets-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const searchVal = document.getElementById('market-search').value.toLowerCase();
    const catVal = document.getElementById('market-category').value;
    
    let filtered = state.markets;
    
    if (searchVal) {
        filtered = filtered.filter(m => m.title.toLowerCase().includes(searchVal) || m.description.toLowerCase().includes(searchVal));
    }
    
    if (catVal !== 'all') {
        filtered = filtered.filter(m => m.category === catVal);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full cosmic-card p-12 text-center rounded-2xl opacity-60">
                <span class="material-symbols-outlined text-4xl text-outline mb-2">find_in_page</span>
                <p class="font-display text-sm font-semibold">No active predictions match your filters.</p>
            </div>
        `;
        return;
    }
    
    filtered.forEach((market) => {
        const div = document.createElement('div');
        div.className = 'cosmic-card p-5 rounded-2xl border border-outline-variant/40 flex flex-col justify-between group';
        
        const changeClass = market.change.startsWith('+') ? 'text-primary' : 'text-error';
        const changeIcon = market.change.startsWith('+') ? 'trending_up' : 'trending_down';
        
        div.innerHTML = `
            <div>
                <div class="flex justify-between items-center mb-3">
                    <span class="px-2 py-0.5 bg-surface-container rounded text-[9px] font-bold text-outline uppercase tracking-wider">${market.badge}</span>
                    <span class="flex items-center gap-1 font-label text-[10px] ${changeClass} font-bold">
                        <span class="material-symbols-outlined text-[10px]">${changeIcon}</span>
                        ${market.change}
                    </span>
                </div>
                
                <h4 class="font-headline text-lg font-bold text-on-surface mb-2 group-hover:text-primary transition-colors cursor-pointer" onclick="openInsightDrawer('${market.id}')">${market.title}</h4>
                <p class="text-xs text-on-surface/70 leading-relaxed mb-4 line-clamp-2">${market.description}</p>
            </div>
            
            <div>
                <!-- Odds Bar Sparkline visual -->
                <div class="flex items-center gap-2 mb-4 bg-surface-container/40 p-2.5 rounded-lg border border-outline-variant/20">
                    <div class="flex-1 flex flex-col gap-1">
                        <div class="flex justify-between text-[10px] font-bold text-outline">
                            <span>YES: ${(market.yesOdds * 100).toFixed(0)}¢</span>
                            <span>NO: ${(market.noOdds * 100).toFixed(0)}¢</span>
                        </div>
                        <div class="w-full bg-white/40 dark:bg-black/40 h-1 rounded-full overflow-hidden">
                            <div class="bg-primary h-full transition-all duration-500" style="width: ${market.yesOdds * 100}%"></div>
                        </div>
                    </div>
                    <!-- Sparkline -->
                    <div class="w-16 h-8 text-primary">
                        ${renderSparkline(market.history)}
                    </div>
                </div>
                
                <div class="flex justify-between items-center pt-3 border-t border-outline-variant/20">
                    <div class="flex flex-col">
                        <span class="text-[9px] text-outline font-bold uppercase tracking-wider">Volume</span>
                        <span class="text-xs font-bold text-on-surface">${market.volume.toLocaleString()} SOM</span>
                    </div>
                    <button class="px-4 py-2 bg-primary text-white font-label text-[10px] font-bold rounded-lg hover:bg-on-primary-fixed-variant transition-all uppercase tracking-wider shadow-sm" onclick="openInsightDrawer('${market.id}')">
                        Predict
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(div);
    });
    
    applyCardGlowEffects();
}

function renderSparkline(history) {
    if (!history || history.length < 2) return '';
    const width = 60;
    const height = 28;
    const max = Math.max(...history);
    const min = Math.min(...history);
    const range = max - min === 0 ? 1 : max - min;
    
    const points = history.map((val, index) => {
        const x = (index / (history.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    
    return `
        <svg viewBox="0 0 ${width} ${height}" class="w-full h-full">
            <polyline fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${points}"></polyline>
        </svg>
    `;
}

// Tab 3: AI Agent Creator Lab
function renderAgentLab() {
    const container = document.getElementById('agents-monitor-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    state.agents.forEach((agent) => {
        const div = document.createElement('div');
        div.className = 'cosmic-card p-5 rounded-2xl border border-outline-variant/40 flex flex-col justify-between';
        
        div.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-3 border-b border-outline-variant/20 pb-2">
                    <div>
                        <h4 class="font-display text-md font-bold text-on-surface flex items-center gap-1.5">
                            <span class="w-2.5 h-2.5 rounded-full bg-${agent.color} shadow-[0_0_5px_rgba(0,0,0,0.1)]"></span>
                            ${agent.name}
                        </h4>
                        <span class="text-[9px] text-outline uppercase font-semibold">${agent.strategy}</span>
                    </div>
                    <span class="text-xs px-2 py-0.5 bg-surface-container rounded text-outline font-bold">L1 Core</span>
                </div>
                
                <p class="text-xs text-on-surface/80 bg-surface-container/50 p-2.5 rounded-lg border border-outline-variant/20 mb-4 font-mono leading-relaxed h-12 overflow-hidden flex items-center">
                    ${agent.status}
                </p>
            </div>
            
            <div class="grid grid-cols-3 gap-2 border-t border-outline-variant/20 pt-3 text-center">
                <div class="flex flex-col">
                    <span class="text-[8px] text-outline uppercase font-bold">Accuracy</span>
                    <span class="text-xs font-bold text-primary">${agent.accuracy}%</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[8px] text-outline uppercase font-bold">SOM Capital</span>
                    <span class="text-xs font-bold text-on-surface">${agent.capital} SOM</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[8px] text-outline uppercase font-bold">Total Trades</span>
                    <span class="text-xs font-bold text-on-surface">${agent.trades}</span>
                </div>
            </div>
        `;
        
        container.appendChild(div);
    });
    
    document.getElementById('total-agents-deployed-text').textContent = `${state.agents.length} cores active`;
    applyCardGlowEffects();
}

// Tab 4: Portfolio
function renderPortfolio() {
    // Top headers updates
    document.getElementById('port-net-worth').textContent = `${state.wallet.netWorth.toFixed(2)} SOM`;
    document.getElementById('port-available').textContent = `${state.wallet.balance.toFixed(2)} SOM`;
    document.getElementById('port-locked').textContent = `${state.wallet.lockedBalance.toFixed(2)} SOM`;
    
    // ROI calculation based on positions
    let totalPnl = 0;
    state.positions.forEach(pos => {
        // Sync current price from market odds
        const m = state.markets.find(x => x.id === pos.marketId);
        if (m) {
            pos.currentPrice = pos.side === 'YES' ? m.yesOdds : m.noOdds;
        }
        totalPnl += pos.pnl;
    });
    
    const pnlEl = document.getElementById('port-pnl');
    pnlEl.textContent = `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} SOM`;
    if (totalPnl >= 0) {
        pnlEl.className = "text-2xl font-bold font-display text-primary tracking-tight";
    } else {
        pnlEl.className = "text-2xl font-bold font-display text-error tracking-tight";
    }
    
    // Render user positions
    const container = document.getElementById('portfolio-positions-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (state.positions.length === 0) {
        container.innerHTML = `
            <div class="h-full flex items-center justify-center flex-col gap-2 p-6 opacity-60 text-center">
                <span class="material-symbols-outlined text-3xl">account_balance_wallet</span>
                <span class="text-xs font-bold text-outline uppercase tracking-wider">No active positions</span>
                <p class="text-[10px]">Your predictions will display here once confirmed.</p>
            </div>
        `;
        return;
    }
    
    state.positions.forEach((pos) => {
        const div = document.createElement('div');
        div.className = 'bg-surface-container/60 p-4 rounded-xl border border-outline-variant/20 flex flex-col gap-2 relative overflow-hidden';
        
        const sideColor = pos.side === 'YES' ? 'text-primary bg-primary/10' : 'text-error bg-error/10';
        
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex flex-col gap-0.5">
                    <span class="font-display text-xs font-bold text-on-surface line-clamp-1">${pos.marketTitle}</span>
                    <span class="text-[8px] text-outline font-semibold uppercase">Holding: ${pos.shares.toFixed(2)} shares</span>
                </div>
                <span class="text-[9px] px-2 py-0.5 rounded font-bold uppercase ${sideColor}">${pos.side}</span>
            </div>
            
            <div class="flex justify-between items-center text-[10px] mt-2 border-t border-dashed border-outline-variant/20 pt-2 text-outline">
                <div class="flex flex-col">
                    <span>Invested</span>
                    <span class="font-bold text-on-surface">${pos.invested.toFixed(2)} SOM</span>
                </div>
                <div class="flex flex-col text-right">
                    <span>PnL</span>
                    <span class="font-bold ${pos.pnl >= 0 ? 'text-primary' : 'text-error'}">${pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)} SOM</span>
                </div>
            </div>
        `;
        
        container.appendChild(div);
    });
}

// Tab 5: Activity Ledger
function renderActivityLedger() {
    const container = document.getElementById('activity-table-body');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (state.transactions.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="py-12 text-center font-display text-outline opacity-60">
                    <span class="material-symbols-outlined text-3xl mb-2">article</span>
                    <p class="text-xs font-semibold">Ledger is completely empty.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    state.transactions.forEach((tx) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-outline-variant/20 hover:bg-surface-container/30 transition-colors';
        
        tr.innerHTML = `
            <td class="py-4 px-6 font-mono text-[10px] tracking-wider text-primary cursor-pointer hover:underline" onclick="copyToClipboard('${tx.hash}', 'Transaction hash copied!')">
                ${tx.hash.substring(0, 10)}...${tx.hash.substring(34)}
            </td>
            <td class="py-4 px-6 font-semibold">${tx.action}</td>
            <td class="py-4 px-6 text-outline font-mono text-[10px]">${tx.sender}</td>
            <td class="py-4 px-6 text-on-surface/80 leading-relaxed font-semibold">${tx.details}</td>
            <td class="py-4 px-6 text-outline text-[10px]">${tx.timestamp}</td>
        `;
        
        container.appendChild(tr);
    });
}

// --- SYSTEM MODAL AND SLIDEOVER RENDERING ---

function openInsightDrawer(marketId) {
    const market = state.markets.find(m => m.id === marketId);
    if (!market) return;
    
    // Set active drawer state context
    state.drawerContext.marketId = marketId;
    state.drawerContext.side = 'YES'; // default
    
    // Populate elements
    document.getElementById('insight-category').textContent = market.badge;
    document.getElementById('insight-ref').textContent = `Ref: ${market.ref}`;
    document.getElementById('insight-title').textContent = market.title;
    document.getElementById('insight-desc').textContent = market.description;
    document.getElementById('insight-agent').innerHTML = `
        <span class="material-symbols-outlined text-xs">spa</span>
        ${market.agent}
    `;
    document.getElementById('insight-confidence').textContent = `${market.confidence}%`;
    document.getElementById('insight-yes-odds').textContent = `${market.yesOdds.toFixed(2)} SOM`;
    document.getElementById('insight-no-odds').textContent = `${market.noOdds.toFixed(2)} SOM`;
    
    // Reset inputs
    document.getElementById('trade-amount').value = '';
    document.getElementById('trade-shares-calc').textContent = '0.00 YES';
    
    // Highlight YES tab select by default
    document.getElementById('trade-side-yes').click();
    
    // Setup color matching classes
    let colorTheme = market.agent === 'EcoAgent' || market.agent === 'MacroAgent' ? 'primary' : 
                     market.agent === 'SocialAgent' ? 'secondary' : 'tertiary';
                     
    document.getElementById('insight-category').className = `px-2.5 py-0.5 bg-${colorTheme}/10 rounded-full text-[9px] font-label font-bold text-${colorTheme} uppercase border border-${colorTheme}/20`;
    
    // Open drawer
    const drawer = document.getElementById('insight-drawer');
    drawer.classList.add('open');
}

function calculateEstShares() {
    const amt = parseFloat(document.getElementById('trade-amount').value);
    const market = state.markets.find(m => m.id === state.drawerContext.marketId);
    
    if (!market || isNaN(amt) || amt <= 0) {
        document.getElementById('trade-shares-calc').textContent = `0.00 ${state.drawerContext.side}`;
        return;
    }
    
    const odds = state.drawerContext.side === 'YES' ? market.yesOdds : market.noOdds;
    const shares = amt / odds;
    
    document.getElementById('trade-shares-calc').textContent = `${shares.toLocaleString(undefined, {maximumFractionDigits:2})} ${state.drawerContext.side}`;
}

// Execute buy of Yes/No shares
function executeTradePrediction() {
    const amt = parseFloat(document.getElementById('trade-amount').value);
    const market = state.markets.find(m => m.id === state.drawerContext.marketId);
    
    if (!market) return;
    
    if (isNaN(amt) || amt <= 0) {
        alertFloatNotification('Please enter a valid investment amount.', 'error');
        return;
    }
    
    if (amt > state.wallet.balance) {
        alertFloatNotification('Insufficient available SOM tokens.', 'error');
        return;
    }
    
    const odds = state.drawerContext.side === 'YES' ? market.yesOdds : market.noOdds;
    const shares = amt / odds;
    
    // Deduct available, lock in portfolio
    state.wallet.balance -= amt;
    state.wallet.lockedBalance += amt;
    
    // Record Position
    const existingPos = state.positions.find(p => p.marketId === market.id && p.side === state.drawerContext.side);
    if (existingPos) {
        const totalInvested = existingPos.invested + amt;
        const totalShares = existingPos.shares + shares;
        existingPos.shares = totalShares;
        existingPos.avgPrice = totalInvested / totalShares;
    } else {
        state.positions.push({
            id: 'pos_' + Date.now(),
            marketId: market.id,
            marketTitle: market.title,
            side: state.drawerContext.side,
            shares: shares,
            avgPrice: odds,
            currentPrice: odds,
            get invested() { return this.shares * this.avgPrice; },
            get value() { return this.shares * this.currentPrice; },
            get pnl() { return this.value - this.invested; }
        });
    }
    
    // Log Activity Blockchain explorer
    const txHash = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
    state.transactions.unshift({
        hash: txHash,
        action: 'Prediction Contract Execution',
        sender: '0x78aF92C3D3...662e',
        details: `Purchased ${shares.toFixed(2)} ${state.drawerContext.side} shares of '${market.title}' at ${odds.toFixed(2)} SOM`,
        timestamp: 'just now'
    });
    
    // Add Consciousness Log
    addConsciousnessLog(`User prediction contract authorized on Somnia block. Invested ${amt.toFixed(2)} SOM in ${state.drawerContext.side} shares on ${market.title}.`, 'primary');
    
    // Close Drawer, Notify & Re-render
    document.getElementById('insight-drawer').classList.remove('open');
    alertFloatNotification(`Bought ${shares.toFixed(2)} ${state.drawerContext.side} shares successfully!`, 'success');
    
    // Increment market Volume
    market.volume += amt;
    
    renderAll();
    saveStateToLocalStorage();
}

// Faucet free claim minting
function executeFaucetMint() {
    const faucetBtn = document.getElementById('wallet-faucet-btn');
    faucetBtn.disabled = true;
    faucetBtn.innerHTML = `
        <span class="material-symbols-outlined text-xs animate-spin">eco</span>
        Minting...
    `;
    
    // Add dynamic glowing minting animation to the button
    faucetBtn.classList.add('minting-orb');
    
    setTimeout(() => {
        state.wallet.balance += 100.00;
        
        // Log transaction
        const txHash = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
        state.transactions.unshift({
            hash: txHash,
            action: 'Faucet Testnet Claim',
            sender: '0x78aF92C3D3...662e',
            details: 'Minted +100.00 SOM from Somnia faucet validator',
            timestamp: 'just now'
        });
        
        addConsciousnessLog(`Faucet contract confirmed block minting 100.00 SOM to user wallet.`, 'primary');
        alertFloatNotification('Minted +100.00 SOM successfully!', 'success');
        
        // Reset Button
        faucetBtn.disabled = false;
        faucetBtn.classList.remove('minting-orb');
        faucetBtn.innerHTML = `
            <span class="material-symbols-outlined text-xs">faucet</span>
            Claim Faucet
        `;
        
        renderAll();
        renderWalletModal();
        saveStateToLocalStorage();
    }, 1500);
}

function renderWalletModal() {
    document.getElementById('wallet-address').textContent = state.wallet.address;
    document.getElementById('wallet-balance').textContent = `${state.wallet.balance.toFixed(2)} SOM`;
}

// Deploy Custom Core Agent
function deployNewAgent() {
    const nameInput = document.getElementById('deploy-agent-name');
    const stratSelect = document.getElementById('deploy-agent-strategy');
    const targetSelect = document.getElementById('deploy-agent-target');
    const capSlider = document.getElementById('deploy-agent-capital');
    
    const name = nameInput.value.trim();
    if (!name) {
        alertFloatNotification('Please enter a valid Agent core identifier.', 'error');
        return;
    }
    
    const cap = parseFloat(capSlider.value);
    if (cap > state.wallet.balance) {
        alertFloatNotification('Insufficient available SOM tokens for initial deployment seed.', 'error');
        return;
    }
    
    // Deduct balance
    state.wallet.balance -= cap;
    
    // Trigger animated Overlay in deployment process
    const deployBtn = document.getElementById('deploy-agent-btn');
    deployBtn.disabled = true;
    deployBtn.innerHTML = `
        <span class="material-symbols-outlined text-sm animate-spin">hourglass_empty</span>
        Mining Block & Deploying...
    `;
    
    // Simulate beautiful step-by-step terminal logs
    addConsciousnessLog(`Initiating EVM compilation for agent: ${name}...`, 'tertiary');
    
    setTimeout(() => {
        addConsciousnessLog(`Verifying contract bytecode signatures...`, 'secondary');
    }, 1000);
    
    setTimeout(() => {
        addConsciousnessLog(`Mining contract deploy block at index 14,809,002...`, 'primary');
        
        // Add to active agents list
        state.agents.unshift({
            name: name,
            strategy: stratSelect.value,
            target: targetSelect.value,
            capital: cap,
            accuracy: 70 + Math.floor(Math.random() * 25), // 70% to 95%
            trades: 0,
            status: 'Agent core booted. Connecting RPC listeners...',
            color: 'tertiary'
        });
        
        // Add transaction
        const txHash = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
        state.transactions.unshift({
            hash: txHash,
            action: 'AI Agent Deployment',
            sender: '0x78aF92C3D3...662e',
            details: `Successfully deployed agent '${name}' with ${cap} SOM capital seed.`,
            timestamp: 'just now'
        });
        
        // Reset deploy form inputs
        nameInput.value = '';
        capSlider.value = 50;
        document.getElementById('deploy-capital-value').textContent = '50 SOM';
        
        // Reset Button
        deployBtn.disabled = false;
        deployBtn.innerHTML = `
            <span class="material-symbols-outlined text-sm">smart_toy</span>
            Deploy Core on Somnia
        `;
        
        alertFloatNotification(`Agent '${name}' Deployed Successfully!`, 'success');
        renderAll();
        saveStateToLocalStorage();
    }, 2500);
}

// --- AI CONSCIOUSNESS & HIVE CHAT PANEL ---

function renderConsciousnessLogs() {
    const container = document.getElementById('log-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    state.consciousnessLogs.forEach((log) => {
        const div = document.createElement('div');
        div.className = "flex gap-4 typewriter-fade";
        
        div.innerHTML = `
            <div class="pt-1 shrink-0">
                <span class="block w-2 h-2 rounded-full bg-${log.color}/60 animate-pulse"></span>
            </div>
            <div class="flex flex-col">
                <span class="font-body text-sm text-on-surface">${log.text}</span>
                <span class="font-label text-[10px] text-outline mt-1 font-bold">[${log.age}]</span>
            </div>
        `;
        
        container.appendChild(div);
    });
}

function addConsciousnessLog(text, color = 'primary') {
    state.consciousnessLogs.unshift({
        text: text,
        color: color,
        age: 'just now'
    });
    
    // limit queue
    if (state.consciousnessLogs.length > 8) {
        state.consciousnessLogs.pop();
    }
    
    renderConsciousnessLogs();
}

// Send interactive Hive chat message
function sendHiveChatMessage() {
    const input = document.getElementById('hive-chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    
    input.value = '';
    
    const container = document.getElementById('chat-messages-container');
    
    // Append User Message
    const userDiv = document.createElement('div');
    userDiv.className = "flex flex-col gap-1 max-w-[85%] bg-primary/10 p-3 rounded-2xl rounded-tr-none border border-primary/20 self-end";
    userDiv.innerHTML = `
        <span class="font-bold text-primary text-[10px] uppercase font-label">You (Seeder)</span>
        <p class="leading-relaxed">${msg}</p>
    `;
    container.appendChild(userDiv);
    container.scrollTop = container.scrollHeight;
    
    // Trigger typing anim loading
    const typingDiv = document.createElement('div');
    typingDiv.className = "flex flex-col gap-1 max-w-[85%] bg-surface-container/60 p-3 rounded-2xl rounded-tl-none border border-outline-variant/20 self-start mt-2";
    typingDiv.innerHTML = `
        <span class="font-bold text-primary text-[10px] uppercase font-label">Astra Hive Mind</span>
        <div class="py-1">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
    
    // Generate AI response
    setTimeout(() => {
        container.removeChild(typingDiv);
        
        let response = generateHiveMindResponse(msg);
        
        const aiDiv = document.createElement('div');
        aiDiv.className = "flex flex-col gap-1 max-w-[85%] bg-surface-container/60 p-3 rounded-2xl rounded-tl-none border border-outline-variant/20 self-start mt-2";
        aiDiv.innerHTML = `
            <span class="font-bold text-primary text-[10px] uppercase font-label">Astra Hive Mind</span>
            <p class="leading-relaxed">${response}</p>
        `;
        container.appendChild(aiDiv);
        container.scrollTop = container.scrollHeight;
    }, 1200);
}

function generateHiveMindResponse(prompt) {
    const q = prompt.toLowerCase();
    
    if (q.includes('balance') || q.includes('wallet') || q.includes('how much')) {
        return `Your active wallet balance is currently **${state.wallet.balance.toFixed(2)} SOM** liquid, with **${state.wallet.lockedBalance.toFixed(2)} SOM** allocated inside prediction smart contracts. Total portfolio valuation stands at **${state.wallet.netWorth.toFixed(2)} SOM**.`;
    }
    
    if (q.includes('portfolio') || q.includes('position') || q.includes('profit')) {
        if (state.positions.length === 0) {
            return "You currently do not hold any active share positions in the Astra prediction pools. Explore the 'Markets' view to seed your first prediction contract.";
        }
        let list = state.positions.map(p => `- **${p.marketTitle}**: ${p.shares.toFixed(0)} shares of ${p.side} (PnL: ${p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)} SOM)`).join('<br>');
        return `Your current active positions are:<br>${list}<br>All trades are synchronized directly with the Somnia L1 blockchain state.`;
    }
    
    if (q.includes('agent') || q.includes('core')) {
        let activeStr = state.agents.map(a => `**${a.name}** (${a.strategy} - Cap: ${a.capital} SOM)`).join(', ');
        return `We currently have **${state.agents.length} active cognitive cores** on the Somnia network: ${activeStr}. You can compile and deploy additional autonomous decision modules in the **AI Creator Lab**.`;
    }
    
    if (q.includes('market') || q.includes('predict')) {
        let activeMarkets = state.markets.map(m => `- **${m.title}**: YES at ${(m.yesOdds*100).toFixed(0)}¢ / NO at ${(m.noOdds*100).toFixed(0)}¢`).join('<br>');
        return `Current hot prediction pools currently trading on AstraMarkets:<br>${activeMarkets}<br>Would you like me to open the analytics drawer for any of these?`;
    }
    
    if (q.includes('somnia') || q.includes('l1') || q.includes('network')) {
        return "Somnia L1 is our underlying high-throughput consensus layer. Boasting sub-second block confirmations and transaction throughput exceeding 100,000 TPS, it ensures our autonomous agents can execute arbitrage transactions without front-running risks.";
    }
    
    if (q.includes('hi') || q.includes('hello') || q.includes('greet')) {
        return "Welcome back, Seeder. How can the Astra Markets intelligence protocols coordinate with your capital allocation directives today?";
    }
    
    // Default smart financial generic response
    const customFills = [
        "Analyzing cross-chain liquidity paths suggest early institutional accumulation.",
        "We are detecting high correlation matrices between tech index chips and GPU rental pricing indexes.",
        "Astra cognitive nodes are predicting a shift in volatility variables on Somnia L1 over the next epochs.",
        "Offshore derivatives indicators are trading at premium values, signaling high confidence trends."
    ];
    return `${customFills[Math.floor(Math.random() * customFills.length)]} Let me know if you would like me to compile a specific transaction script or filter the Astra Stream feeds.`;
}

// Governance Vote Action
function executeGovernanceVote(choice) {
    if (state.rootedDecision.hasVoted) {
        alertFloatNotification('Governance weight already registered for this epoch.', 'error');
        return;
    }
    
    state.rootedDecision.hasVoted = true;
    
    if (choice === 'YES') {
        state.rootedDecision.yesVotes += 4;
        addConsciousnessLog("Governance vote weight registered: Support YES on L1 Gas Token Arbitrage.", "primary");
    } else {
        state.rootedDecision.noVotes += 4;
        addConsciousnessLog("Governance vote weight registered: Counter NO on L1 Gas Token Arbitrage.", "error");
    }
    
    // Animate change
    const yesWeight = state.rootedDecision.yesVotes;
    const noWeight = state.rootedDecision.noVotes;
    const total = yesWeight + noWeight;
    const yesPct = (yesWeight / total) * 100;
    const noPct = (noWeight / total) * 100;
    
    document.getElementById('vote-yes-label').textContent = `Support Yes: ${yesPct.toFixed(0)}%`;
    document.getElementById('vote-no-label').textContent = `Against No: ${noPct.toFixed(0)}%`;
    document.getElementById('rooted-decision-progress').style.width = `${yesPct}%`;
    
    document.getElementById('decision-status').textContent = 'VOTE DELEGATED';
    document.getElementById('decision-status').className = 'text-[9px] font-bold uppercase tracking-widest text-outline px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/30';
    
    alertFloatNotification('Governance vote recorded successfully!', 'success');
}

// --- UTILITIES & SIMULATION ENGINE ---

// Float notification toast
function alertFloatNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `fixed bottom-8 left-[100px] px-5 py-3 rounded-xl border text-xs font-bold font-label uppercase shadow-2xl transition-all duration-300 z-50 flex items-center gap-2 transform translate-y-10 opacity-0`;
    
    const bg = type === 'success' ? 'bg-primary text-white border-primary/20' : 'bg-error text-white border-error/20';
    const icon = type === 'success' ? 'check_circle' : 'warning';
    
    notif.className += ` ${bg}`;
    notif.innerHTML = `
        <span class="material-symbols-outlined text-sm">${icon}</span>
        ${message}
    `;
    
    document.body.appendChild(notif);
    
    // Animate in
    setTimeout(() => {
        notif.classList.remove('translate-y-10', 'opacity-0');
    }, 50);
    
    // Fade out and remove
    setTimeout(() => {
        notif.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => document.body.removeChild(notif), 300);
    }, 3000);
}

// Setup background simulation clock
function setupSimulation() {
    let tickCount = 0;
    
    setInterval(() => {
        // Multiplier ticks based on settings speed
        const loops = state.simulationSpeed;
        for (let i = 0; i < loops; i++) {
            runSimulationTick(tickCount++);
        }
    }, 6000); // Trigger a tick event every 6 seconds
}

function runSimulationTick(tick) {
    // 1. Odds Fluctuation (Volatile Market dynamics)
    const market = state.markets[Math.floor(Math.random() * state.markets.length)];
    const delta = (Math.random() * 0.04 - 0.02); // -2% to +2% shift
    
    market.yesOdds = Math.max(0.05, Math.min(0.95, market.yesOdds + delta));
    market.noOdds = 1 - market.yesOdds;
    
    // Update odds history Sparkline
    market.history.push(market.yesOdds);
    if (market.history.length > 8) market.history.shift();
    
    // Recalculate 24h change values
    const changePct = (delta * 100);
    market.change = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`;
    
    // 2. Autonomous Agent trade simulations
    if (state.autoTrade && Math.random() > 0.6) {
        const agent = state.agents[Math.floor(Math.random() * state.agents.length)];
        const tradeAmt = 50 + Math.floor(Math.random() * 150);
        
        agent.trades++;
        agent.status = `Purchasing ${tradeAmt} shares on '${market.title}'...`;
        
        // Log Consciousness thought
        const actionType = Math.random() > 0.5 ? 'YES' : 'NO';
        addConsciousnessLog(`${agent.name} executed ${actionType} contract order for ${tradeAmt} SOM shares on ${market.title}.`, agent.color);
        
        // Log transaction explorer
        const txHash = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
        state.transactions.unshift({
            hash: txHash,
            action: 'Agent Smart Arbitrage',
            sender: agent.name,
            details: `Agent placed ${tradeAmt} SOM prediction order on '${market.title}'`,
            timestamp: 'just now'
        });
        
        // Limit transactions
        if (state.transactions.length > 20) state.transactions.pop();
        
        // Notify new feed events if we are not on feed
        if (state.activeTab !== 'feed') {
            document.getElementById('feed-badge').classList.remove('hidden');
            document.getElementById('feed-notif').classList.remove('hidden');
        }
    }
    
    // 3. Autonomous Market creation (if enabled)
    if (state.autoMarket && tick > 0 && tick % 15 === 0) {
        generateAutonomousMarket();
    }
    
    // 4. Governance Decision updating
    if (tick > 0 && tick % 20 === 0) {
        cycleGovernanceDecision();
    }
    
    // 5. Update Synaptic Load value randomly
    const baseLoad = 35.0;
    const peakGlow = Math.sin(tick / 5.0) * 15.0;
    const dynamicOffset = Math.random() * 8.0;
    const finalLoad = baseLoad + peakGlow + dynamicOffset;
    document.getElementById('synaptic-load-value').textContent = `${finalLoad.toFixed(1)}%`;
    
    // Re-render views currently in focus
    if (state.activeTab === 'feed') renderFeed();
    if (state.activeTab === 'markets') renderMarkets();
    if (state.activeTab === 'agents') renderAgentLab();
    if (state.activeTab === 'portfolio') renderPortfolio();
    if (state.activeTab === 'activity') renderActivityLedger();
    saveStateToLocalStorage();
}

// Auto-generation of random new market events
function generateAutonomousMarket() {
    const marketIdeas = [
        {
            title: 'L1 Bridge TVL Liquidity Peg Lockup',
            category: 'crypto',
            badge: 'Crypto Architecture',
            desc: 'Multi-signature vaults locking capital pools across Somnia bridge channels. Arbitrage ratios holding steady at current epochs.',
            agent: 'MacroAgent',
            theme: 'primary',
            statusText: 'Growth Surge'
        },
        {
            title: 'Decentralized LLM Inference Gas Arbitrage',
            category: 'tech',
            badge: 'Compute Architecture',
            desc: 'Gas limits adjustments on Somnia blockchain proposed to subsidize large-scale agent training computations.',
            agent: 'RiskAgent',
            theme: 'secondary',
            statusText: 'Steady Flow'
        },
        {
            title: 'EVM Gas Fee Deflationary Target Reached',
            category: 'crypto',
            badge: 'Crypto Architecture',
            desc: 'Sub-confirmation latency indexes mapping gas burning cycles suggest complete stabilization target achieved ahead of timeline.',
            agent: 'EcoAgent',
            theme: 'primary',
            statusText: 'Growth Surge'
        }
    ];
    
    const idea = marketIdeas[Math.floor(Math.random() * marketIdeas.length)];
    
    // Avoid double creations
    if (state.markets.some(m => m.title === idea.title)) return;
    
    const newId = 'm_' + Date.now();
    
    state.markets.unshift({
        id: newId,
        title: idea.title,
        category: idea.category,
        badge: idea.badge,
        statusText: 'Earthy Growth',
        ref: `#${Math.floor(1000 + Math.random()*9000)}-N`,
        description: idea.desc,
        confidence: 65 + Math.floor(Math.random() * 28),
        yesOdds: 0.50,
        noOdds: 0.50,
        volume: 2500.00,
        change: '+0.0%',
        agent: idea.agent,
        history: [0.50, 0.50, 0.50],
        isSimulated: true
    });
    
    // Limit active markets list to keep browser light
    if (state.markets.length > 8) {
        state.markets.pop();
    }
    
    addConsciousnessLog(`New consensus prediction market initialized dynamically: '${idea.title}'`, 'tertiary');
    alertFloatNotification(`New prediction pool opened: ${idea.title}`, 'success');
    saveStateToLocalStorage();
}

// Governance proposal recycling
function cycleGovernanceDecision() {
    const proposals = [
        "Decrease L1 gas margins for autonomous transactions?",
        "Authorize RiskAgent integration with secondary TVL pools?",
        "Fund new computing clusters on Somnia decentralized nodes?",
        "Authorize validation pool reward distributions?"
    ];
    
    const prop = proposals[Math.floor(Math.random() * proposals.length)];
    
    state.rootedDecision.text = prop;
    state.rootedDecision.yesVotes = 50 + Math.floor(Math.random()*20);
    state.rootedDecision.noVotes = 100 - state.rootedDecision.yesVotes;
    state.rootedDecision.hasVoted = false;
    
    // Reset visual state
    document.getElementById('rooted-decision-text').textContent = prop;
    document.getElementById('rooted-decision-progress').style.width = `${state.rootedDecision.yesVotes}%`;
    document.getElementById('vote-yes-label').textContent = `Support Yes: ${state.rootedDecision.yesVotes}%`;
    document.getElementById('vote-no-label').textContent = `Against No: ${state.rootedDecision.noVotes}%`;
    
    document.getElementById('decision-status').textContent = 'VOTING ACTIVE';
    document.getElementById('decision-status').className = 'text-[9px] font-bold uppercase tracking-widest text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20';
    
    addConsciousnessLog(`New governance decision submitted to blockchain: '${prop}'`, 'primary');
}

// Copy to clipboard helper utility
window.copyToClipboard = function(text, successMsg) {
    navigator.clipboard.writeText(text).then(() => {
        alertFloatNotification(successMsg, 'success');
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
};
window.openInsightDrawer = openInsightDrawer; // make global for dynamic html clicks
