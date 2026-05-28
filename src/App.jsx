import React, { useState, useEffect } from 'react';
import './App.css';

const trendingSuggestions = [
  {
    id: 'tech_1',
    category: 'TECH',
    title: 'GPT-5 Autumn Release',
    prompt: 'Create a market for OpenAI announcing GPT-5 before October 2025',
    volume: '$3.4M',
    hotness: '98%',
    icon: 'developer_board'
  },
  {
    id: 'tech_2',
    category: 'TECH',
    title: 'Foldable Apple iPhone',
    prompt: 'Create a market for Apple launching its first fully foldable iPhone in 2025',
    volume: '$1.8M',
    hotness: '89%',
    icon: 'devices'
  },
  {
    id: 'tech_3',
    category: 'TECH',
    title: 'AGI Verification by Lab',
    prompt: 'Create a market for a major AI laboratory claiming to achieve AGI by 2026',
    volume: '$5.1M',
    hotness: '94%',
    icon: 'psychology'
  },
  {
    id: 'crypto_1',
    category: 'CRYPTO',
    title: 'Bitcoin $150K Target',
    prompt: 'Create a market for BTC crossing $150k before July 2025',
    volume: '$18.9M',
    hotness: '97%',
    icon: 'currency_bitcoin'
  },
  {
    id: 'crypto_2',
    category: 'CRYPTO',
    title: 'Solana Active Users Spike',
    prompt: 'Create a market for Solana active addresses exceeding 5 million in Q3',
    volume: '$4.1M',
    hotness: '92%',
    icon: 'token'
  },
  {
    id: 'crypto_3',
    category: 'CRYPTO',
    title: 'ETH Spot ETF Net Inflow',
    prompt: 'Create a market for ETH spot ETFs achieving $1B net inflow in first 10 days of release',
    volume: '$8.2M',
    hotness: '85%',
    icon: 'account_balance_wallet'
  },
  {
    id: 'politics_1',
    category: 'POLITICS',
    title: 'US Election Vote Speed',
    prompt: 'Create a market for the US presidential election resolution happening within 24 hours of closing',
    volume: '$45.1M',
    hotness: '99%',
    icon: 'gavel'
  },
  {
    id: 'politics_2',
    category: 'POLITICS',
    title: 'UK Snap Election Timeline',
    prompt: 'Create a market for the UK Prime Minister calling for a snap election before 2026',
    volume: '$5.9M',
    hotness: '76%',
    icon: 'storefront'
  },
  {
    id: 'general_1',
    category: 'SPORTS',
    title: 'Real Madrid Trophy Run',
    prompt: 'Create a market for Real Madrid winning the next Champions League final',
    volume: '$6.2M',
    hotness: '84%',
    icon: 'sports_soccer'
  },
  {
    id: 'general_2',
    category: 'GENERAL',
    title: 'SpaceX Starship Booster Catch',
    prompt: 'Create a market for SpaceX catching the Starship booster on IFT-5',
    volume: '$18.4M',
    hotness: '96%',
    icon: 'rocket_launch'
  }
];

function App() {
  // Navigation View State: 'landing', 'feed', 'creator', or 'terminal'
  const [currentView, setCurrentView] = useState('landing'); 

  // Dark Mode Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Core Feed Status Filter State: 'COMING', 'ACTIVE', or 'ENDED'
  const [activeFeedFilter, setActiveFeedFilter] = useState('ACTIVE');

  // Global Active Trading Context (Swapped by Feed, Landing, and Creator Actions)
  const [activeMarket, setActiveMarket] = useState({
    title: 'ETH 2.0 Hard Fork Success?',
    confidence: '98.2',
    impliedPrice: 0.84,
    closesIn: '04H 22M 11S',
    vol: '$1.2M',
    openInterest: '$458K',
    drift: '+0.12%',
    yesPrice: 0.84,
    noPrice: 0.16
  });

  // Ticking index trackers
  const [btcPrice, setBtcPrice] = useState(64231.50);
  const [btcPercent, setBtcPercent] = useState(2.4);
  const [ethPrice, setEthPrice] = useState(3450.12);
  const [ethPercent, setEthPercent] = useState(1.8);
  const [aiSentiment, setAiSentiment] = useState(88);
  const [volume, setVolume] = useState(1.2);
  const [blockNum, setBlockNum] = useState(19432204);
  const [gasPrice, setGasPrice] = useState(14);

  // Dynamic terminal trading state
  const [tradeSize, setTradeSize] = useState(500);
  const [selectedDirection, setSelectedDirection] = useState('YES'); // 'YES' or 'NO'
  const [activeTab, setActiveTab] = useState('PROBABILITY'); // 'PROBABILITY' or 'VOLUME'
  const [activeChartRange, setActiveChartRange] = useState('4H'); // '1H', '4H', '1D', '1W'
  const [pulsingRowIndex, setPulsingRowIndex] = useState(null);
  
  // Real countdown states for Closing Market
  const [countdown, setCountdown] = useState({ hours: 4, minutes: 22, seconds: 11 });

  // Core Feed Column categories definition
  const feedCategories = [
    { id: 'TECH', label: 'Tech Feed', icon: 'developer_board', color: 'text-bearish' },
    { id: 'CRYPTO', label: 'Crypto Feed', icon: 'currency_bitcoin', color: 'text-primary' },
    { id: 'SPORTS', label: 'Sports Feed', icon: 'sports_soccer', color: 'text-bullish-green' },
    { id: 'FINANCE', label: 'Finance Feed', icon: 'payments', color: 'text-accent-gold' },
    { id: 'POLITICS', label: 'Politics Feed', icon: 'gavel', color: 'text-bullish' }
  ];

  // Prepopulated Cinematic scroll-snap Feed Cards across Tech, Crypto, Sports, Finance, Politics with dynamic statuses and circular passport thumbnails
  const [feedCards] = useState([
    // TECH
    {
      id: 1,
      title: "Will AI prove P=NP by 2026?",
      volume: "$2.4M",
      yesProb: 64,
      noProb: 36,
      yesPrice: 0.64,
      noPrice: 0.36,
      confidence: "88.0",
      openInterest: "$210K",
      drift: "+0.45%",
      category: "TECH",
      status: "ACTIVE",
      passport: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "Oracle Alpha"
    },
    {
      id: 2,
      title: "Will OpenAI announce GPT-5 before October?",
      volume: "$9.4M",
      yesProb: 58,
      noProb: 42,
      yesPrice: 0.58,
      noPrice: 0.42,
      confidence: "91.2",
      openInterest: "$580K",
      drift: "+1.20%",
      category: "TECH",
      status: "COMING",
      passport: "https://images.unsplash.com/photo-1684369175833-31f0cf0f23cb?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "AI Synthesizer"
    },
    {
      id: 11,
      title: "Will Apple launch its first fully foldable iPhone in 2025?",
      volume: "$14.1M",
      yesProb: 40,
      noProb: 60,
      yesPrice: 0.40,
      noPrice: 0.60,
      confidence: "87.5",
      openInterest: "$790K",
      drift: "-0.10%",
      category: "TECH",
      status: "ENDED",
      passport: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "Venture Node"
    },
    // CRYPTO
    {
      id: 3,
      title: "BTC to cross $150k before July 2025?",
      volume: "$18.9M",
      yesProb: 12,
      noProb: 88,
      yesPrice: 0.12,
      noPrice: 0.88,
      confidence: "89.4",
      openInterest: "$1.4M",
      drift: "+1.18%",
      category: "CRYPTO",
      status: "COMING",
      passport: "https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "DeFi Pulse"
    },
    {
      id: 4,
      title: "Will Solana active addresses exceed 5 million in Q3?",
      volume: "$4.1M",
      yesProb: 62,
      noProb: 38,
      yesPrice: 0.62,
      noPrice: 0.38,
      confidence: "94.0",
      openInterest: "$420K",
      drift: "+0.85%",
      category: "CRYPTO",
      status: "ACTIVE",
      passport: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "SOL Scanner"
    },
    {
      id: 12,
      title: "Will ETH spot ETFs achieve $1B net inflow in first 10 days?",
      volume: "$22.4M",
      yesProb: 88,
      noProb: 12,
      yesPrice: 0.88,
      noPrice: 0.12,
      confidence: "95.0",
      openInterest: "$2.1M",
      drift: "+3.40%",
      category: "CRYPTO",
      status: "ENDED",
      passport: "https://images.unsplash.com/photo-1622790698141-94e304bcbbad?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "L1 Network Agent"
    },
    // SPORTS
    {
      id: 5,
      title: "Will Real Madrid win the Champions League final?",
      volume: "$6.2M",
      yesProb: 58,
      noProb: 42,
      yesPrice: 0.58,
      noPrice: 0.42,
      confidence: "82.4",
      openInterest: "$480K",
      drift: "-0.15%",
      category: "SPORTS",
      status: "ENDED",
      passport: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "Oracle Sports"
    },
    {
      id: 6,
      title: "Will Ferrari secure the Constructor Championship?",
      volume: "$2.8M",
      yesProb: 34,
      noProb: 66,
      yesPrice: 0.34,
      noPrice: 0.66,
      confidence: "76.0",
      openInterest: "$150K",
      drift: "+0.10%",
      category: "SPORTS",
      status: "ACTIVE",
      passport: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "Race Predictor"
    },
    {
      id: 13,
      title: "Will the FIFA 2030 host country secure all matches in Europe?",
      volume: "$1.9M",
      yesProb: 20,
      noProb: 80,
      yesPrice: 0.20,
      noPrice: 0.80,
      confidence: "74.0",
      openInterest: "$95K",
      drift: "+0.00%",
      category: "SPORTS",
      status: "COMING",
      passport: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "Telemetry Node"
    },
    // FINANCE
    {
      id: 7,
      title: "Will the Fed cut interest rates by 50bps or more in September?",
      volume: "$12.4M",
      yesProb: 68,
      noProb: 32,
      yesPrice: 0.68,
      noPrice: 0.32,
      confidence: "92.0",
      openInterest: "$920K",
      drift: "+1.05%",
      category: "FINANCE",
      status: "ACTIVE",
      passport: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "Macro Oracle"
    },
    {
      id: 8,
      title: "Will Gold price cross $2,800/oz before Q4?",
      volume: "$8.7M",
      yesProb: 45,
      noProb: 55,
      yesPrice: 0.45,
      noPrice: 0.55,
      confidence: "88.0",
      openInterest: "$610K",
      drift: "-0.40%",
      category: "FINANCE",
      status: "COMING",
      passport: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "Asset Engine"
    },
    {
      id: 14,
      title: "Will NVIDIA Q2 total revenues beat high-end target of $33.2B?",
      volume: "$18.4M",
      yesProb: 55,
      noProb: 45,
      yesPrice: 0.55,
      noPrice: 0.45,
      confidence: "91.0",
      openInterest: "$1.2M",
      drift: "+1.05%",
      category: "FINANCE",
      status: "ENDED",
      passport: "https://images.unsplash.com/photo-1591453089816-0fbb971b454c?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "Finance Node"
    },
    // POLITICS
    {
      id: 9,
      title: "Will the US election resolution happen within 24 hours of closing?",
      volume: "$45.1M",
      yesProb: 81,
      noProb: 19,
      yesPrice: 0.81,
      noPrice: 0.19,
      confidence: "96.4",
      openInterest: "$4.8M",
      drift: "+2.10%",
      category: "POLITICS",
      status: "ACTIVE",
      passport: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "Capital Watch"
    },
    {
      id: 10,
      title: "Will the UK Prime Minister call for a snap election before 2026?",
      volume: "$5.9M",
      yesProb: 28,
      noProb: 72,
      yesPrice: 0.28,
      noPrice: 0.72,
      confidence: "84.2",
      openInterest: "$340K",
      drift: "-0.05%",
      category: "POLITICS",
      status: "COMING",
      passport: "https://images.unsplash.com/photo-1513635269975-59663e0ca1ad?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "Westminster Node"
    },
    {
      id: 15,
      title: "Will France snap legislative assembly elections trigger new coalition in July?",
      volume: "$11.4M",
      yesProb: 65,
      noProb: 35,
      yesPrice: 0.65,
      noPrice: 0.35,
      confidence: "89.0",
      openInterest: "$540K",
      drift: "+1.15%",
      category: "POLITICS",
      status: "ENDED",
      passport: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=200",
      bgImage: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=800",
      nodeIcon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      nodeName: "Westminster Node"
    }
  ]);

  // Chat Feed messages state
  const [chatText, setChatText] = useState('');
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'bot', 
      sender: 'ASTRA_ORACLE', 
      time: 'JUST NOW', 
      content: 'Neural drift suggests a heavy breakthrough in T-minus 12 mins. Probability vectoring @ 88%.' 
    },
    { 
      id: 2, 
      type: 'user', 
      sender: 'TradeWhale_77', 
      time: '2M AGO', 
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
      content: 'Just dropped 50k on YES. The technicals are too clean to ignore.' 
    }
  ]);

  // AI Market Creator chat states
  const [creatorInput, setCreatorInput] = useState('Create a market for the next Starship orbital flight success');
  const [isProcessingCreator, setIsProcessingCreator] = useState(false);
  const [launchingMarket, launchingMarketSet] = useState(null); // Tracks market currently in L1 rocket launch status
  const [selectedSuggestionTab, setSelectedSuggestionTab] = useState('ALL');
  const [creatorMessages, setCreatorMessages] = useState([
    {
      id: 1,
      type: 'user',
      content: 'Create a market for the next Starship orbital flight success'
    },
    {
      id: 2,
      type: 'bot',
      isProposal: true,
      title: 'Will SpaceX Starship Integrated Flight Test 4 achieve its primary orbital objectives?',
      expiry: 'Q3 2024',
      category: 'SPACE',
      resolves: 'ORACLE',
      likelihood: '68% CONF.',
      yesProb: 68,
      noProb: 32
    }
  ]);

  // Day & Night mode toggling core logic
  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const nextVal = !prev;
      if (nextVal) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return nextVal;
    });
  };

  // Quick trade activation helper from Feed/Landing/Creator
  const activateTerminalTrade = (marketTitle, yesPrice, noPrice, confidence, vol, openInterest, drift) => {
    setActiveMarket({
      title: marketTitle,
      confidence: confidence || '92.4',
      impliedPrice: yesPrice,
      closesIn: '04H 22M 11S',
      vol: vol || '$1.2M',
      openInterest: openInterest || '$458K',
      drift: drift || '+0.12%',
      yesPrice: yesPrice,
      noPrice: noPrice
    });
    setSelectedDirection('YES');
    setCurrentView('terminal');
  };

  // Handle post message
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatText.trim()) return;

    const newMessageObj = {
      id: Date.now(),
      type: 'user',
      sender: 'Trader_Anon',
      time: 'JUST NOW',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=100',
      content: chatText
    };

    setMessages(prev => [newMessageObj, ...prev]);
    setChatText('');
  };

  // Handle AI Market Creator chat structure
  const handleSendCreator = (e) => {
    e.preventDefault();
    if (!creatorInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: creatorInput
    };

    setCreatorMessages(prev => [...prev, userMessage]);
    setIsProcessingCreator(true);

    const inputLower = creatorInput.toLowerCase();
    setCreatorInput('');

    setTimeout(() => {
      // Dynamic Neural Market structures
      let proposedTitle = `Will ${userMessage.content.replace(/create a market for/gi, '').trim()} occur successfully before 2026?`;
      let proposedCategory = 'GENERAL';
      let proposedExpiry = 'Q4 2025';
      let proposedResolves = 'ORACLE';
      let yesProb = 50;
      let noProb = 50;

      if (inputLower.includes('btc') || inputLower.includes('bitcoin')) {
        proposedTitle = 'Will Bitcoin surpass $100,000 by December 31st, 2024?';
        proposedCategory = 'FINANCE';
        proposedExpiry = 'Q4 2024';
        yesProb = 74;
        noProb = 26;
      } else if (inputLower.includes('solana') || inputLower.includes('sol')) {
        proposedTitle = 'Will Solana active addresses exceed 5 million in Q3?';
        proposedCategory = 'DEFI';
        proposedExpiry = 'Q3 2024';
        yesProb = 62;
        noProb = 38;
      } else if (inputLower.includes('election') || inputLower.includes('president') || inputLower.includes('us')) {
        proposedTitle = 'Will the US election resolution happen within 24 hours of closing?';
        proposedCategory = 'POLITICS';
        proposedExpiry = 'Q4 2024';
        yesProb = 81;
        noProb = 19;
      } else if (inputLower.includes('apple') || inputLower.includes('gpt') || inputLower.includes('openai') || inputLower.includes('ai')) {
        proposedTitle = 'Will OpenAI announce GPT-5 before October 2024?';
        proposedCategory = 'TECH';
        proposedExpiry = 'Q3 2024';
        yesProb = 58;
        noProb = 42;
      }

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        isProposal: true,
        title: proposedTitle,
        expiry: proposedExpiry,
        category: proposedCategory,
        resolves: proposedResolves,
        likelihood: `${yesProb}% CONF.`,
        yesProb: yesProb,
        noProb: noProb
      };

      setCreatorMessages(prev => [...prev, botMessage]);
      setIsProcessingCreator(false);
    }, 1200);
  };

  // Handle select suggestion instantly populates and submits the proposal
  const handleSelectSuggestion = (promptText) => {
    setCreatorInput(promptText);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: promptText
    };

    setCreatorMessages(prev => [...prev, userMessage]);
    setIsProcessingCreator(true);

    const inputLower = promptText.toLowerCase();
    setCreatorInput('');

    setTimeout(() => {
      // Dynamic Neural Market structures
      let proposedTitle = `Will ${promptText.replace(/create a market for/gi, '').trim()} occur successfully before 2026?`;
      let proposedCategory = 'GENERAL';
      let proposedExpiry = 'Q4 2025';
      let proposedResolves = 'ORACLE';
      let yesProb = 50;
      let noProb = 50;

      if (inputLower.includes('btc') || inputLower.includes('bitcoin')) {
        proposedTitle = 'Will Bitcoin surpass $100,000 by December 31st, 2024?';
        proposedCategory = 'FINANCE';
        proposedExpiry = 'Q4 2024';
        yesProb = 74;
        noProb = 26;
      } else if (inputLower.includes('solana') || inputLower.includes('sol')) {
        proposedTitle = 'Will Solana active addresses exceed 5 million in Q3?';
        proposedCategory = 'DEFI';
        proposedExpiry = 'Q3 2024';
        yesProb = 62;
        noProb = 38;
      } else if (inputLower.includes('election') || inputLower.includes('president') || inputLower.includes('us')) {
        proposedTitle = 'Will the US election resolution happen within 24 hours of closing?';
        proposedCategory = 'POLITICS';
        proposedExpiry = 'Q4 2024';
        yesProb = 81;
        noProb = 19;
      } else if (inputLower.includes('apple') || inputLower.includes('gpt') || inputLower.includes('openai') || inputLower.includes('ai')) {
        proposedTitle = 'Will OpenAI announce GPT-5 before October 2024?';
        proposedCategory = 'TECH';
        proposedExpiry = 'Q3 2024';
        yesProb = 58;
        noProb = 42;
      }

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        isProposal: true,
        title: proposedTitle,
        expiry: proposedExpiry,
        category: proposedCategory,
        resolves: proposedResolves,
        likelihood: `${yesProb}% CONF.`,
        yesProb: yesProb,
        noProb: noProb
      };

      setCreatorMessages(prev => [...prev, botMessage]);
      setIsProcessingCreator(false);
    }, 1200);
  };

  // Launch on-chain simulated status sequencer
  const handleLaunchOnChain = (market) => {
    launchingMarketSet(market);

    setTimeout(() => {
      // Transition back to Terminal with the newly spawned structured AI market!
      const yesPriceVal = +(market.yesProb / 100).toFixed(2);
      const noPriceVal = +(market.noProb / 100).toFixed(2);

      activateTerminalTrade(
        market.title,
        yesPriceVal,
        noPriceVal,
        String(market.yesProb),
        '$250K',
        '$15K',
        '+0.00%'
      );
      
      launchingMarketSet(null);
      alert(`🎉 SECURE ON-CHAIN LAUNCH COMPLETE! \n"${market.title}" has been deployed directly onto the Somnia L1 ledger! Initialized liquidity pools.`);
    }, 2000);
  };

  // Fluctuating ticker values & ticking clocks
  useEffect(() => {
    const interval = setInterval(() => {
      // BTC Fluctuation
      if (Math.random() > 0.5) {
        const change = (Math.random() - 0.5) * 10;
        setBtcPrice(prev => +(prev + change).toFixed(2));
        setBtcPercent(prev => +(prev + (change / 64231.5) * 100).toFixed(2));
      }
      
      // ETH Fluctuation
      if (Math.random() > 0.5) {
        const change = (Math.random() - 0.5) * 2;
        setEthPrice(prev => +(prev + change).toFixed(2));
        setEthPercent(prev => +(prev + (change / 3450.12) * 100).toFixed(2));
      }

      // Sentiment Fluctuation
      if (Math.random() > 0.8) {
        setAiSentiment(prev => {
          const change = Math.floor((Math.random() - 0.5) * 4);
          const newVal = prev + change;
          return newVal > 100 ? 100 : newVal < 0 ? 0 : newVal;
        });
      }

      // Block Number increment
      if (Math.random() > 0.7) {
        setBlockNum(prev => prev + 1);
      }

      // Gas Fluctuation
      if (Math.random() > 0.6) {
        setGasPrice(prev => {
          const change = Math.floor((Math.random() - 0.5) * 3);
          const newVal = prev + change;
          return newVal < 5 ? 5 : newVal > 60 ? 60 : newVal;
        });
      }

      // Ticker pulse order book row
      if (Math.random() > 0.4) {
        const randomIndex = Math.floor(Math.random() * 4); // 4 rows
        setPulsingRowIndex(randomIndex);
        setTimeout(() => setPulsingRowIndex(null), 800);
      }

    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Timer Tick implementation
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        let s = prev.seconds - 1;
        let m = prev.minutes;
        let h = prev.hours;

        if (s < 0) {
          s = 59;
          m -= 1;
        }
        if (m < 0) {
          m = 59;
          h -= 1;
        }
        if (h < 0) {
          h = 0; m = 0; s = 0;
        }
        return { hours: h, minutes: m, seconds: s };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Position & payout calculator logic bound to active market context
  const activeSharePrice = selectedDirection === 'YES' ? activeMarket.yesPrice : activeMarket.noPrice;
  const estShares = +(tradeSize / activeSharePrice).toFixed(2);
  const potentialPayout = +(estShares * 1.00).toFixed(2);

  // Formatting utility
  const formatTime = (num) => String(num).padStart(2, '0');

  // Multi-column smooth scrolling anchor helper
  const scrollToColumn = (colId) => {
    const el = document.getElementById(`col-${colId.toLowerCase()}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface selection:bg-primary/20 flex flex-col w-full overflow-x-hidden">
      {/* Background Texture Pattern dot grid */}
      <div className="fixed inset-0 sand-pattern pointer-events-none z-0"></div>

      {/* L1 Rocket Launching Overlay Modal */}
      {launchingMarket && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
          <div className="sahara-card p-10 rounded-2xl max-w-md text-center space-y-6 bg-surface border-2 border-primary/20">
            <span className="material-symbols-outlined text-primary text-6xl animate-bounce">rocket_launch</span>
            <h3 className="serif-heading text-2xl text-on-surface">NEURAL DEPLOYER</h3>
            <p className="text-sm text-on-surface-variant font-medium animate-pulse">Structuring liquidity pool contract...</p>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-marquee w-[60%]"></div>
            </div>
            <p className="text-[10px] font-mono text-on-surface-variant/60 uppercase">Securing transactions on Somnia L1...</p>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-12 h-20 bg-surface/90 backdrop-blur-md border-b border-outline-variant">
        <div className="flex items-center gap-10">
          <span 
            className="font-bold text-xl tracking-tight sahara-gradient-text uppercase cursor-pointer font-display"
            onClick={() => setCurrentView('landing')}
          >
            ASTRAMARKETS
          </span>
          <nav className="hidden md:flex gap-8">
            <button 
              className={`font-semibold text-sm pb-1 transition-all ${currentView === 'landing' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
              onClick={() => setCurrentView('landing')}
            >
              Markets
            </button>
            <button 
              className={`font-semibold text-sm pb-1 transition-all ${currentView === 'feed' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
              onClick={() => setCurrentView('feed')}
            >
              Core Feed
            </button>
            <button 
              className={`font-semibold text-sm pb-1 transition-all ${currentView === 'creator' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
              onClick={() => setCurrentView('creator')}
            >
              AI Agent
            </button>
            <button 
              className={`font-semibold text-sm pb-1 transition-all ${currentView === 'terminal' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
              onClick={() => setCurrentView('terminal')}
            >
              Terminal
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center bg-surface-variant rounded-full px-5 py-2 border border-outline-variant">
            <span className="material-symbols-outlined text-on-surface-variant text-lg mr-2">search</span>
            <input 
              className="bg-transparent border-none outline-none text-sm font-medium w-48 text-on-surface placeholder:text-on-surface-variant/60 focus:ring-0" 
              placeholder="Search markets..." 
              type="text"
            />
          </div>
          <div className="flex gap-4">
            <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-all">sensors</button>
            <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-all">account_balance_wallet</button>
            
            {/* Day / Night Mode theme switcher */}
            <button 
              className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-all p-2 rounded-full hover:bg-surface-variant/40"
              onClick={toggleTheme}
              title={isDarkMode ? "Switch to Day Mode" : "Switch to Night Mode"}
            >
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </button>

            <div className="relative">
              <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-all">notifications</button>
              <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full ring-2 ring-surface"></span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full border-2 border-outline-variant p-0.5">
            <img 
              alt="User avatar" 
              className="w-full h-full rounded-full object-cover grayscale hover:grayscale-0 transition-all cursor-pointer" 
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"
            />
          </div>
        </div>
      </header>

      {/* VIEW 1: LANDING PAGE */}
      {currentView === 'landing' && (
        <>
          {/* Marquee Ticker */}
          <div className="fixed top-20 left-0 w-full z-40 bg-surface border-b border-outline/20 h-10 flex items-center marquee-container overflow-hidden">
            <div className="flex whitespace-nowrap animate-marquee items-center gap-12 px-6">
              <div className="flex items-center gap-3 font-medium text-[11px] tracking-widest uppercase">
                <span className="text-on-surface-variant font-mono">BTC/USD</span>
                <span className="text-primary font-semibold font-mono">
                  {btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} 
                  <span className="text-[10px] opacity-70 ml-1 font-mono">({btcPercent >= 0 ? '+' : ''}{btcPercent}%)</span>
                </span>
              </div>
              <div className="flex items-center gap-3 font-medium text-[11px] tracking-widest uppercase">
                <span className="text-on-surface-variant font-mono">ETH/USD</span>
                <span className="text-primary font-semibold font-mono">
                  {ethPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} 
                  <span className="text-[10px] opacity-70 ml-1 font-mono">({ethPercent >= 0 ? '+' : ''}{ethPercent}%)</span>
                </span>
              </div>
              <div className="flex items-center gap-3 font-medium text-[11px] tracking-widest uppercase">
                <span className="text-on-surface-variant font-mono">AI SENTIMENT</span>
                <span className="text-on-surface font-semibold font-mono">OPTIMISTIC <span className="text-primary">({aiSentiment}%)</span></span>
              </div>
              <div className="flex items-center gap-3 font-medium text-[11px] tracking-widest uppercase">
                <span className="text-on-surface-variant font-mono">SOMNIA VOL</span>
                <span className="text-on-surface font-semibold font-mono">${volume}B</span>
              </div>
              {/* Duplicate for seamless loop */}
              <div className="flex items-center gap-3 font-medium text-[11px] tracking-widest uppercase">
                <span className="text-on-surface-variant font-mono">BTC/USD</span>
                <span className="text-primary font-semibold font-mono">
                  {btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <main className="relative pt-36 pb-6 h-[calc(100vh-120px)] flex flex-col justify-between items-center px-4 md:px-8 flex-grow w-full max-w-5xl mx-auto z-10 overflow-hidden">
            
            {/* Hero Top Content Block */}
            <div className="w-full text-center flex flex-col items-center flex-grow justify-center max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-primary/20 mb-3 bg-surface shadow-sm text-[9px] font-bold tracking-[0.25em] text-primary uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Somnia L1 Autonomous Engine
              </div>
              
              <h1 className="serif-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.08] mb-3 text-on-surface tracking-tight font-extrabold">
                Where AI turns information into <span className="italic text-primary">markets.</span>
              </h1>
              
              <p className="max-w-2xl mx-auto text-on-surface-variant text-xs sm:text-sm md:text-base font-medium leading-relaxed mb-6 opacity-90 px-2">
                The world's first autonomous prediction ecosystem. ASTRAMARKETS scans petabytes of global data to generate precision markets before the news even breaks.
              </p>
              
              <div className="flex flex-row gap-4 justify-center items-center px-4 w-full mb-2">
                <button 
                  className="px-6 sm:px-8 py-3.5 bg-primary text-white rounded-lg font-bold text-[10px] tracking-[0.2em] uppercase hover:bg-on-surface transition-colors shadow-lg shadow-primary/20"
                  onClick={() => setCurrentView('creator')}
                >
                  Launch AI Creator
                </button>
                <button 
                  className="px-6 sm:px-8 py-3.5 bg-surface border border-outline text-on-surface rounded-lg font-bold text-[10px] tracking-[0.2em] uppercase hover:border-primary hover:text-primary transition-all"
                  onClick={() => setCurrentView('feed')}
                >
                  Explore Feed
                </button>
              </div>
            </div>

            {/* Quick Preview Market Pick Grid */}
            <div className="w-full max-w-3xl z-20 mt-2 mb-2">
              <p className="text-[9px] font-bold tracking-[0.3em] text-primary uppercase text-center mb-4 font-mono">ASTRA-VERIFIED HOT PREVIEWS</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
                <div 
                  className="sahara-card p-4 rounded-xl cursor-pointer hover:border-primary transition-all flex flex-col justify-between"
                  onClick={() => activateTerminalTrade('Will ETH hit $4k before October 30th?', 0.72, 0.28, '72.0', '$2.1M', '$310K', '+0.15%')}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-bold tracking-[0.2em] text-primary uppercase border border-primary/20 px-2 py-0.5 rounded font-mono">ASTRA VERIFIED</span>
                    <span className="material-symbols-outlined text-primary/40 text-xs">account_balance</span>
                  </div>
                  <p className="serif-heading text-sm text-on-surface leading-tight mb-2 italic">Will ETH hit $4k before October 30th?</p>
                  <div className="w-full bg-primary-container h-1 rounded-full mb-1">
                    <div className="bg-primary h-full w-[72%]"></div>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold tracking-widest uppercase">
                    <span className="text-primary font-mono">YES 72%</span>
                    <span className="text-on-surface-variant/40 font-mono">NO 28%</span>
                  </div>
                </div>

                <div 
                  className="sahara-card p-4 rounded-xl cursor-pointer hover:border-primary transition-all flex flex-col justify-between"
                  onClick={() => activateTerminalTrade('Nvidia Q3 Revenue: Above $33B?', 0.45, 0.55, '45.0', '$4.8M', '$890K', '-0.04%')}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-bold tracking-[0.2em] text-on-surface-variant/80 uppercase border border-outline px-2 py-0.5 rounded font-mono">MARKET PREVIEW</span>
                    <span className="material-symbols-outlined text-primary/40 text-xs">trending_up</span>
                  </div>
                  <p className="serif-heading text-sm text-on-surface leading-tight mb-2">Nvidia Q3 Revenue: Above $33B?</p>
                  <div className="w-full bg-primary-container h-1 rounded-full mb-1">
                    <div className="bg-primary h-full w-[45%]"></div>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold tracking-widest uppercase">
                    <span className="text-primary font-mono">YES 45%</span>
                    <span className="text-on-surface-variant/40 font-mono">NO 55%</span>
                  </div>
                </div>
              </div>
            </div>

          </main>
        </>
      )}

      {/* VIEW 2: CORE SNAP FEED (Multi-column snap dashboard feed wall!) */}
      {currentView === 'feed' && (
        <div className="pt-20 flex flex-col w-full h-[calc(100vh-80px)] overflow-hidden bg-background relative z-10">
          
          {/* Glassy, Floating Unified Status Selector & Category Anchor Bar */}
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[45] flex flex-col md:flex-row items-center gap-4 bg-surface/90 backdrop-blur-md border border-outline-variant rounded-2xl md:rounded-full p-2 shadow-lg w-auto max-w-[95%]">
            
            {/* Status Filter Tab Segment (COMING -> ACTIVE -> ENDED) */}
            <div className="flex items-center gap-1 bg-surface-variant/40 border border-outline-variant/60 rounded-full p-1 font-mono">
              <button 
                className={`px-4.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase transition-all flex items-center gap-1.5 ${activeFeedFilter === 'COMING' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
                onClick={() => setActiveFeedFilter('COMING')}
              >
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shrink-0"></span>
                Coming
              </button>
              <button 
                className={`px-4.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase transition-all flex items-center gap-1.5 ${activeFeedFilter === 'ACTIVE' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
                onClick={() => setActiveFeedFilter('ACTIVE')}
              >
                <span className="w-1.5 h-1.5 bg-bullish-green rounded-full animate-ping shrink-0"></span>
                Active
              </button>
              <button 
                className={`px-4.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase transition-all flex items-center gap-1.5 ${activeFeedFilter === 'ENDED' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
                onClick={() => setActiveFeedFilter('ENDED')}
              >
                <span className="w-1.5 h-1.5 bg-on-surface-variant/40 rounded-full shrink-0"></span>
                Ended
              </button>
            </div>

            <div className="hidden md:block h-6 w-px bg-outline-variant/80"></div>

            {/* Category Column Quick Selector */}
            <div className="flex items-center gap-1.5">
              {feedCategories.map((col) => (
                <button 
                  key={col.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold font-mono tracking-wider transition-all uppercase text-on-surface-variant hover:text-primary hover:bg-surface-variant/40"
                  onClick={() => scrollToColumn(col.id)}
                >
                  <span className="material-symbols-outlined text-[13px] leading-none">{col.icon}</span>
                  <span>{col.label.replace(' Feed', '')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Horizontally scrollable column wrapper */}
          <main className="pt-16 pb-4 px-4 w-full h-full overflow-x-auto flex gap-6 z-10 scrollbar-thin">
            {feedCategories.map((col) => {
              // Filter cards belonging specifically to this feed AND the active status filter!
              const cardsInCol = feedCards.filter(card => card.category === col.id && card.status === activeFeedFilter);
              
              return (
                <div 
                  id={`col-${col.id.toLowerCase()}`}
                  key={col.id} 
                  className="min-w-[320px] max-w-[340px] flex-shrink-0 flex flex-col h-full bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm animate-subtle-fade"
                >
                  {/* Column Header */}
                  <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-variant/20">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-base ${col.color}`}>{col.icon}</span>
                      <h3 className="font-bold text-xs uppercase tracking-widest text-on-surface">{col.label}</h3>
                    </div>
                    <span className="font-mono text-[9px] font-bold bg-primary-container text-primary px-2 py-0.5 rounded-full">
                      {cardsInCol.length} MATCHED
                    </span>
                  </div>
                  
                  {/* Vertical scroll-snapping card deck in column */}
                  <div className="flex-grow overflow-y-auto col-snap-container p-4 space-y-4">
                    {cardsInCol.length > 0 ? (
                      cardsInCol.map((card) => (
                        <div 
                          key={card.id} 
                          className="col-snap-section w-full aspect-[9/14.2] sahara-card rounded-xl overflow-hidden flex flex-col relative bg-surface border border-outline-variant/60 shadow-sm"
                        >
                          {/* Background Layer */}
                          <div className="absolute inset-0 z-0">
                            <img 
                              className="w-full h-full object-cover opacity-15 grayscale hover:grayscale-0 transition-all duration-700" 
                              src={card.bgImage}
                              alt={card.title}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"></div>
                          </div>
                          
                          {/* Content Overlay */}
                          <div className="relative z-10 flex flex-col h-full p-5 justify-between animate-subtle-fade">
                            {/* Top Node Bar */}
                            <div className="flex justify-between items-center shrink-0">
                              {/* Status Badging */}
                              {card.status === 'COMING' && (
                                <span className="border border-amber-500/30 bg-amber-500/10 text-amber-500 text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono uppercase">
                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shrink-0"></span>
                                  Coming Soon
                                </span>
                              )}
                              {card.status === 'ACTIVE' && (
                                <span className="border border-bullish-green/30 bg-bullish-green/10 text-bullish-green text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono uppercase">
                                  <span className="w-1.5 h-1.5 bg-bullish-green rounded-full animate-ping shrink-0"></span>
                                  Active Live
                                </span>
                              )}
                              {card.status === 'ENDED' && (
                                <span className="border border-outline/50 bg-surface-container-low text-on-surface-variant/60 text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono uppercase">
                                  <span className="w-1.5 h-1.5 bg-on-surface-variant/30 rounded-full shrink-0"></span>
                                  Ended Resolved
                                </span>
                              )}

                              <span className="font-mono font-bold text-[8px] tracking-wider text-primary border border-primary/20 px-1.5 py-0.5 rounded uppercase">
                                {card.drift}
                              </span>
                            </div>

                            {/* Passport Avatar Thumbnail (Framed Larger Rounded Square inside the middle!) */}
                            <div className="w-22 h-22 mx-auto rounded-xl border border-outline-variant p-0.5 bg-surface shadow-sm overflow-hidden shrink-0 flex items-center justify-center my-2.5 transition-transform hover:scale-105 duration-300">
                              <img 
                                className="w-full h-full rounded-lg object-cover" 
                                src={card.passport} 
                                alt={card.title} 
                              />
                            </div>

                            {/* Title & Info */}
                            <div className="my-1 shrink-0 text-center">
                              <h4 className="font-display font-extrabold text-xs sm:text-sm text-on-surface leading-snug tracking-tight mb-1 text-center line-clamp-2 px-1">
                                {card.title}
                              </h4>
                              <p className="font-mono font-bold text-[8px] text-on-surface-variant/60 uppercase tracking-widest text-center">
                                24H VOL: {card.volume}
                              </p>
                            </div>

                            {/* Probabilities */}
                            <div className="grid grid-cols-2 gap-3 mb-2 shrink-0">
                              <button 
                                disabled={card.status !== 'ACTIVE'}
                                className={`py-2 rounded border transition-all flex flex-col items-center justify-center ${card.status === 'ACTIVE' ? 'border-outline bg-surface hover:border-primary cursor-pointer' : 'border-outline/25 bg-surface-variant/10 opacity-55 cursor-not-allowed'}`}
                                onClick={() => activateTerminalTrade(card.title, card.yesPrice, card.noPrice, card.confidence, card.volume, card.openInterest, card.drift)}
                              >
                                <span className="text-[7px] font-bold text-on-surface-variant mb-0.5">YES</span>
                                <span className="font-extrabold text-bullish text-base leading-none font-mono">{card.yesProb}%</span>
                              </button>
                              <button 
                                disabled={card.status !== 'ACTIVE'}
                                className={`py-2 rounded border transition-all flex flex-col items-center justify-center ${card.status === 'ACTIVE' ? 'border-outline bg-surface hover:border-primary cursor-pointer' : 'border-outline/25 bg-surface-variant/10 opacity-55 cursor-not-allowed'}`}
                                onClick={() => activateTerminalTrade(card.title, card.yesPrice, card.noPrice, card.confidence, card.volume, card.openInterest, card.drift)}
                              >
                                <span className="text-[7px] font-bold text-on-surface-variant mb-0.5">NO</span>
                                <span className="font-extrabold text-bearish text-base leading-none font-mono">{card.noProb}%</span>
                              </button>
                            </div>

                            {/* Trade CTA Button (Differentiated states) */}
                            {card.status === 'COMING' && (
                              <button 
                                disabled
                                className="w-full bg-surface-container-high text-on-surface-variant/40 border border-outline-variant/60 py-3 rounded font-display font-bold text-[9px] tracking-[0.2em] uppercase cursor-not-allowed shrink-0 animate-pulse"
                              >
                                COMING SOON
                              </button>
                            )}
                            {card.status === 'ACTIVE' && (
                              <button 
                                className="w-full bg-primary text-white py-3 rounded font-display font-bold text-[9px] tracking-[0.2em] uppercase hover:brightness-105 active:scale-[0.99] transition-all shrink-0 shadow-md shadow-primary/10"
                                onClick={() => activateTerminalTrade(card.title, card.yesPrice, card.noPrice, card.confidence, card.volume, card.openInterest, card.drift)}
                              >
                                PLACE PREDICTION
                              </button>
                            )}
                            {card.status === 'ENDED' && (
                              <button 
                                disabled
                                className="w-full bg-surface-container-low text-on-surface-variant/30 border border-outline-variant/30 py-3 rounded font-display font-bold text-[9px] tracking-[0.2em] uppercase cursor-not-allowed shrink-0"
                              >
                                MARKET RESOLVED
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-surface-variant/10 border border-dashed border-outline-variant rounded-xl">
                        <span className="material-symbols-outlined text-primary/30 text-3xl mb-2 animate-pulse">inventory_2</span>
                        <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase font-mono">NO MATCHING PREDICTIONS</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </main>
        </div>
      )}

      {/* VIEW 3: AI MARKET CREATOR LAB */}
      {currentView === 'creator' && (
        <main className="pt-24 pb-4 px-4 w-full h-[calc(100vh-100px)] grid grid-cols-12 gap-4 max-w-7xl mx-auto z-10 relative overflow-hidden flex-grow">
          
          {/* Left Column: Premium Title Description & Ticking Sahara Stats */}
          <div className="col-span-12 lg:col-span-4 flex flex-col justify-between h-full bg-surface-variant/20 border border-outline-variant rounded-xl p-5 overflow-y-auto">
            {/* Title description block */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary-container text-primary font-mono text-[9px] tracking-widest uppercase font-bold animate-pulse">
                <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                NEURAL ENGINE ACTIVE
              </div>
              <h2 className="serif-heading text-2xl md:text-3xl lg:text-4xl text-on-surface tracking-tight leading-tight">
                Intelligent Markets, <br/><span className="text-primary italic">Deployed Instantly.</span>
              </h2>
              <p className="text-on-surface-variant text-xs leading-relaxed opacity-95">
                Describe your market vision and let ASTRAMARKETS' intelligence structure, validate, and launch liquidity pools directly to the Somnia L1 Devnet ledger.
              </p>
            </div>

            {/* Premium Ticking Stats Deck */}
            <div className="space-y-3 mt-6">
              <div className="bg-surface p-4 rounded-lg border border-outline-variant flex items-center gap-4 shadow-sm">
                <div className="w-9 h-9 rounded bg-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-lg">psychology</span>
                </div>
                <div>
                  <p className="font-mono text-[8px] text-on-surface-variant mb-0.5 uppercase tracking-widest font-bold">AI Probability</p>
                  <p className="font-bold text-xs text-on-surface">94.2% Accuracy Vector</p>
                </div>
              </div>
              <div className="bg-surface p-4 rounded-lg border border-outline-variant flex items-center gap-4 shadow-sm">
                <div className="w-9 h-9 rounded bg-surface-variant flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-lg">link</span>
                </div>
                <div>
                  <p className="font-mono text-[8px] text-on-surface-variant mb-0.5 uppercase tracking-widest font-bold">Network Fee</p>
                  <p className="font-bold text-xs text-on-surface">~0.002 ETH Gas Bound</p>
                </div>
              </div>
              <div className="bg-surface p-4 rounded-lg border border-outline-variant flex items-center gap-4 shadow-sm">
                <div className="w-9 h-9 rounded bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-lg">verified_user</span>
                </div>
                <div>
                  <p className="font-mono text-[8px] text-on-surface-variant mb-0.5 uppercase tracking-widest font-bold">Ledger Oracle</p>
                  <p className="font-bold text-xs text-on-surface">Secure Multi-Oracle</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic internal scrolling Conversational AI parser panel */}
          <div className="col-span-12 lg:col-span-8 bg-surface rounded-xl border border-outline-variant shadow-lg p-5 flex flex-col h-full overflow-hidden">
            {/* Chat Feed Messages Scroller */}
            <div className="flex-grow overflow-y-auto pr-2 space-y-6 min-h-0 col-snap-container">
              {creatorMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-4 col-snap-section">
                  {msg.type === 'user' ? (
                    <>
                      <div className="w-8 h-8 shrink-0 rounded bg-surface-variant flex items-center justify-center border border-outline-variant">
                        <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
                      </div>
                      <div className="bg-surface-variant/40 px-5 py-3 rounded-xl border border-outline-variant max-w-xl">
                        <p className="text-on-surface leading-relaxed text-xs">{msg.content}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 shrink-0 rounded bg-primary-container flex items-center justify-center border border-primary/20">
                        <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>
                      </div>
                      <div className="market-card p-5 md:p-6 rounded-xl w-full max-w-2xl relative shadow-sm bg-surface">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-primary text-[9px] tracking-widest uppercase font-bold">Proposal</span>
                            <span className="px-1.5 py-0.5 bg-bullish-green/10 text-bullish-green text-[8px] rounded font-bold font-mono">ASTRA APPROVED</span>
                          </div>
                          <span className="font-mono text-on-surface-variant text-[9px]">2.14ms Ticker</span>
                        </div>
                        <div className="space-y-4">
                          <h3 className="serif-heading text-base md:text-lg text-on-surface leading-tight font-extrabold">{msg.title}</h3>
                          
                          <div className="grid grid-cols-4 gap-px bg-outline-variant border border-outline-variant rounded overflow-hidden text-[10px]">
                            <div className="bg-surface p-2.5">
                              <div className="text-[8px] font-mono text-on-surface-variant mb-0.5 uppercase tracking-wider font-bold">Expiry</div>
                              <div className="font-mono text-on-surface font-semibold">{msg.expiry}</div>
                            </div>
                            <div className="bg-surface p-2.5">
                              <div className="text-[8px] font-mono text-on-surface-variant mb-0.5 uppercase tracking-wider font-bold">Category</div>
                              <div className="font-mono text-on-surface font-semibold">{msg.category}</div>
                            </div>
                            <div className="bg-surface p-2.5">
                              <div className="text-[8px] font-mono text-on-surface-variant mb-0.5 uppercase tracking-wider font-bold">Resolves</div>
                              <div className="font-mono text-on-surface font-semibold">{msg.resolves}</div>
                            </div>
                            <div className="bg-surface p-2.5">
                              <div className="text-[8px] font-mono text-on-surface-variant mb-0.5 uppercase tracking-wider font-bold">Conf.</div>
                              <div className="font-mono text-bullish-green font-bold">{msg.likelihood}</div>
                            </div>
                          </div>

                          <div className="py-3 border-y border-outline-variant">
                            <div className="flex justify-between items-end mb-2 text-[9px]">
                              <span className="font-mono text-on-surface-variant uppercase tracking-widest font-bold">Neural Sentiment</span>
                              <div className="flex gap-3 font-mono font-bold">
                                <span className="text-bullish-green font-mono">YES {msg.yesProb}%</span>
                                <span className="text-bearish-red font-mono">NO {msg.noProb}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden flex">
                              <div className="h-full bg-primary" style={{ width: `${msg.yesProb}%` }}></div>
                              <div className="h-full bg-secondary opacity-30" style={{ width: `${msg.noProb}%` }}></div>
                            </div>
                          </div>

                          <div className="flex justify-center pt-1">
                            <button 
                              className="group px-6 py-3.5 bg-primary text-white font-mono text-[9px] tracking-[0.2em] rounded-lg transition-all hover:bg-on-surface hover:shadow-lg active:scale-95 uppercase font-bold flex items-center gap-2"
                              onClick={() => handleLaunchOnChain(msg)}
                            >
                              <span>Launch On-chain</span>
                              <span className="material-symbols-outlined text-xs">rocket_launch</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {isProcessingCreator && (
                <div className="flex items-start gap-4 col-snap-section animate-pulse">
                  <div className="w-8 h-8 shrink-0 rounded bg-primary-container flex items-center justify-center border border-primary/20">
                    <span className="material-symbols-outlined text-primary text-sm animate-spin">sync</span>
                  </div>
                  <div className="bg-surface-variant/40 px-5 py-3 rounded-xl border border-outline-variant max-w-xl">
                    <p className="text-on-surface-variant leading-relaxed text-xs">ASTRAMARKETS is analyzing sentiment and structuring liquidity contracts...</p>
                  </div>
                </div>
              )}
            </div>

            {/* 🔥 Global Trending Predictions Panel */}
            <div className="mt-4 border-t border-outline-variant pt-4 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm animate-pulse">local_fire_department</span>
                  <span className="font-mono text-on-surface text-[10px] tracking-widest uppercase font-extrabold">GLOBAL TRENDING TOPICS</span>
                </div>
                <div className="flex items-center gap-1 bg-surface-variant/60 border border-outline-variant/60 rounded-full p-0.5 font-mono text-[9px] w-fit overflow-x-auto">
                  {['ALL', 'TECH', 'CRYPTO', 'POLITICS', 'GENERAL'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase transition-all shrink-0 ${selectedSuggestionTab === tab ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
                      onClick={() => setSelectedSuggestionTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horizontal Scroll Grid of Suggestion Cards */}
              <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin max-w-full">
                {trendingSuggestions
                  .filter(item => selectedSuggestionTab === 'ALL' || item.category === selectedSuggestionTab || (selectedSuggestionTab === 'GENERAL' && (item.category === 'GENERAL' || item.category === 'SPORTS')))
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex-shrink-0 w-64 text-left p-3.5 rounded-xl border border-outline-variant bg-surface-variant/30 hover:border-primary hover:bg-surface-variant/50 transition-all duration-300 group flex flex-col justify-between shadow-xs relative overflow-hidden"
                      onClick={() => handleSelectSuggestion(item.prompt)}
                    >
                      {/* Top Indicator bar */}
                      <div className="flex justify-between items-center w-full mb-2.5">
                        <span className="flex items-center gap-1 text-[8px] font-bold text-on-surface-variant/60 uppercase tracking-widest font-mono">
                          <span className="material-symbols-outlined text-[11px] text-primary">{item.icon}</span>
                          {item.category}
                        </span>
                        <span className="bg-primary/10 text-primary text-[8px] font-bold px-2 py-0.5 rounded font-mono flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[9px]">trending_up</span>
                          {item.hotness}
                        </span>
                      </div>

                      {/* Main Prompt text */}
                      <p className="font-semibold text-xs text-on-surface leading-snug tracking-tight mb-3 line-clamp-2 italic group-hover:text-primary transition-colors">
                        "{item.prompt.replace(/Create a market for /gi, '')}"
                      </p>

                      {/* Bottom Info bar */}
                      <div className="flex justify-between items-center w-full mt-auto pt-2 border-t border-outline-variant/60 text-[8px] font-bold tracking-widest text-on-surface-variant/50 uppercase font-mono">
                        <span>VOL POTENTIAL</span>
                        <span className="text-on-surface font-semibold font-mono">{item.volume}</span>
                      </div>

                      {/* Micro interaction subtle background glow on hover */}
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Compact Input Form Area */}
            <form onSubmit={handleSendCreator} className="mt-4 shrink-0">
              <div className="relative bg-surface-container-low border border-outline-variant rounded-xl p-1 flex items-center gap-3 focus-within:border-primary transition-colors">
                <div className="p-2 ml-1 text-primary">
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                </div>
                <input 
                  className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/50 py-2.5 text-xs outline-none" 
                  placeholder="Describe your market idea..." 
                  type="text"
                  value={creatorInput}
                  onChange={(e) => setCreatorInput(e.target.value)}
                />
                <button type="submit" className="p-2.5 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      )}

      {/* VIEW 4: TRADING TERMINAL */}
      {currentView === 'terminal' && (
        <main className="pt-24 pb-4 px-4 w-full h-[calc(100vh-100px)] grid grid-cols-12 gap-4 max-w-[1600px] mx-auto flex-grow z-10 overflow-hidden">
          
          {/* Left Column: Asset Header, Chart & Order Book Dynamics */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col gap-4 h-full overflow-hidden">
            
            {/* Asset Header Info */}
            <div className="sahara-panel p-4 rounded-xl flex items-center justify-between gap-4 bg-surface shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-surface-variant rounded-xl flex items-center justify-center border border-outline-variant flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
                </div>
                <div>
                  <h1 className="font-bold text-sm sm:text-base text-on-surface tracking-tight mb-0.5">{activeMarket.title}</h1>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-mono">
                      MARKET CLOSES IN: {formatTime(countdown.hours)}H {formatTime(countdown.minutes)}M {formatTime(countdown.seconds)}S
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-6 items-center">
                <div className="text-right">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5 font-mono">AI CONFIDENCE</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-primary font-bold">{activeMarket.confidence}%</span>
                    <div className="h-1 w-16 bg-surface-variant rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${activeMarket.confidence}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="text-right border-l border-outline-variant pl-4 hidden sm:block">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5 font-mono">VOLATILITY</p>
                  <span className="font-bold text-[10px] text-on-surface font-mono">MED-HIGH</span>
                </div>
              </div>
            </div>

            {/* Dynamic Probability Chart Arena */}
            <div className="sahara-panel rounded-xl p-4 relative overflow-hidden flex-grow flex flex-col min-h-0 bg-surface justify-between">
              <div className="flex justify-between items-center mb-3">
                <div className="flex gap-1.5 p-0.5 bg-surface-variant rounded-lg">
                  <button 
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${activeTab === 'PROBABILITY' ? 'bg-surface text-primary shadow-xs' : 'bg-transparent text-on-surface-variant hover:text-on-surface'}`}
                    onClick={() => setActiveTab('PROBABILITY')}
                  >
                    PROBABILITY
                  </button>
                  <button 
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${activeTab === 'VOLUME' ? 'bg-surface text-primary shadow-xs' : 'bg-transparent text-on-surface-variant hover:text-on-surface'}`}
                    onClick={() => setActiveTab('VOLUME')}
                  >
                    VOLUME
                  </button>
                </div>
                <div className="flex items-center gap-3 font-bold text-[10px] text-on-surface-variant font-mono">
                  {['1H', '4H', '1D', '1W'].map(range => (
                    <button 
                      key={range}
                      className={`hover:text-primary transition-all ${activeChartRange === range ? 'text-primary border-b-2 border-primary' : ''}`}
                      onClick={() => setActiveChartRange(range)}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Graphic Plot Area */}
              <div className="relative w-full flex-grow flex items-end min-h-0">
                <svg className="w-full h-full overflow-visible max-h-[160px] md:max-h-[200px]" viewBox="0 0 1000 300" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradientSahara" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#c2652a" stopOpacity="0.15"></stop>
                      <stop offset="100%" stopColor="#c2652a" stopOpacity="0"></stop>
                    </linearGradient>
                  </defs>
                  <path d="M0,250 Q100,240 200,200 T400,180 T600,120 T800,80 T1000,40 L1000,300 L0,300 Z" fill="url(#chartGradientSahara)"></path>
                  <path d="M0,250 Q100,240 200,200 T400,180 T600,120 T800,80 T1000,40" fill="none" stroke="#c2652a" strokeLinecap="round" strokeWidth="2.5"></path>
                  <circle cx="800" cy="80" fill="#c2652a" r="5">
                    <animate attributeName="r" dur="3s" repeatCount="indefinite" values="5;7;5"></animate>
                  </circle>
                </svg>
                <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none">
                  <div className="border-t border-outline-variant/40 w-full"></div>
                  <div className="border-t border-outline-variant/40 w-full"></div>
                  <div className="border-t border-outline-variant/40 w-full"></div>
                </div>
              </div>

              {/* Ticking Tickers Row */}
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                <div className="p-2.5 bg-surface-variant/30 rounded border border-outline-variant/50">
                  <p className="text-[8px] font-bold text-on-surface-variant mb-0.5 uppercase tracking-widest font-mono">Implied Prob.</p>
                  <p className="font-mono text-xs text-primary font-semibold">{(activeMarket.yesPrice * 100).toFixed(1)}%</p>
                </div>
                <div className="p-2.5 bg-surface-variant/30 rounded border border-outline-variant/50">
                  <p className="text-[8px] font-bold text-on-surface-variant mb-0.5 uppercase tracking-widest font-mono">24h Vol.</p>
                  <p className="font-mono text-xs text-on-surface font-semibold">{activeMarket.vol}</p>
                </div>
                <div className="p-2.5 bg-surface-variant/30 rounded border border-outline-variant/50">
                  <p className="text-[8px] font-bold text-on-surface-variant mb-0.5 uppercase tracking-widest font-mono">Open Interest</p>
                  <p className="font-mono text-xs text-on-surface font-semibold">{activeMarket.openInterest}</p>
                </div>
                <div className="p-2.5 bg-surface-variant/30 rounded border border-outline-variant/50">
                  <p className="text-[8px] font-bold text-on-surface-variant mb-0.5 uppercase tracking-widest font-mono">AI Drift</p>
                  <p className={`font-mono text-xs font-semibold ${activeMarket.drift.startsWith('+') ? 'text-bullish-green' : 'text-bearish-red'}`}>{activeMarket.drift}</p>
                </div>
              </div>
            </div>

            {/* Order Book Dynamics Table */}
            <div className="sahara-panel rounded-xl overflow-hidden bg-surface shrink-0 h-[140px] flex flex-col">
              <div className="px-4 py-2.5 border-b border-outline-variant flex justify-between items-center bg-surface-variant/20 shrink-0">
                <h3 className="font-bold text-[9px] text-on-surface tracking-widest uppercase font-mono">ORDER BOOK DYNAMICS</h3>
                <span className="text-[8px] font-mono text-on-surface-variant uppercase font-bold tracking-widest">12ms LATENCY</span>
              </div>
              <div className="overflow-y-auto flex-grow scrollbar-thin">
                <table className="w-full text-left font-mono text-[10px] min-w-[500px]">
                  <thead>
                    <tr className="text-on-surface-variant border-b border-outline-variant bg-surface-variant/10">
                      <th className="px-4 py-2 font-bold uppercase tracking-widest">PRICE</th>
                      <th className="px-4 py-2 font-bold uppercase tracking-widest">SIZE</th>
                      <th className="px-4 py-2 font-bold uppercase tracking-widest">TOTAL</th>
                      <th className="px-4 py-2 font-bold uppercase tracking-widest">TIME</th>
                      <th className="px-4 py-2 font-bold uppercase tracking-widest text-right">SOURCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50">
                    {[
                      { price: (activeMarket.yesPrice * 1.002).toFixed(3), size: '12,400', total: (12400 * activeMarket.yesPrice).toLocaleString(undefined, { maximumFractionDigits: 0 }), time: '12:44:02', source: 'ASTRA_AG01', isBull: true },
                      { price: (activeMarket.yesPrice * 1.001).toFixed(3), size: '8,150', total: (8150 * activeMarket.yesPrice).toLocaleString(undefined, { maximumFractionDigits: 0 }), time: '12:44:01', source: 'MM_ALPHA', isBull: true },
                      { price: activeMarket.yesPrice.toFixed(3), size: '22,000', total: (22000 * activeMarket.yesPrice).toLocaleString(undefined, { maximumFractionDigits: 0 }), time: '12:43:58', source: 'LIQ_PROVIDER_X', isBull: false },
                      { price: (activeMarket.yesPrice * 0.999).toFixed(3), size: '4,200', total: (4200 * activeMarket.yesPrice).toLocaleString(undefined, { maximumFractionDigits: 0 }), time: '12:43:55', source: 'RETAIL_009', isBull: false }
                    ].map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={`transition-colors group hover:bg-primary/5 ${pulsingRowIndex === idx ? 'bg-primary/10' : ''}`}
                      >
                        <td className={`px-4 py-2 font-bold ${row.isBull ? 'text-bullish-green' : 'text-bearish-red'}`}>
                          {row.price}
                        </td>
                        <td className="px-4 py-2">{row.size}</td>
                        <td className="px-4 py-2 text-on-surface-variant">${row.total}</td>
                        <td className="px-4 py-2 text-on-surface-variant">{row.time}</td>
                        <td className="px-4 py-2 text-right font-bold text-on-surface-variant group-hover:text-primary transition-colors">
                          {row.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Execution Form & Internal Scroll live sentiment chat logs */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
            
            {/* Execute Buy Form Card */}
            <div className="sahara-panel rounded-xl p-5 border-t-2 border-t-primary bg-surface shrink-0">
              <h3 className="font-bold text-xs mb-4 flex items-center gap-2 text-on-surface uppercase tracking-widest font-mono">
                <span className="material-symbols-outlined text-primary text-sm">bolt</span>
                EXECUTE POSITION
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-mono">
                <button 
                  className={`flex flex-col items-center justify-center p-2.5 rounded border transition-all active:scale-[0.98] ${selectedDirection === 'YES' ? 'border-bullish-green bg-bullish-green/10 font-bold' : 'border-bullish-green/20 bg-bullish-green/5'}`}
                  onClick={() => setSelectedDirection('YES')}
                >
                  <span className="text-bullish-green mb-0.5">YES</span>
                  <span className="font-mono text-[9px] text-on-surface-variant font-bold">${activeMarket.yesPrice.toFixed(2)}</span>
                </button>
                <button 
                  className={`flex flex-col items-center justify-center p-2.5 rounded border transition-all active:scale-[0.98] ${selectedDirection === 'NO' ? 'border-bearish-red bg-bearish-red/10 font-bold' : 'border-bearish-red/20 bg-bearish-red/5'}`}
                  onClick={() => setSelectedDirection('NO')}
                >
                  <span className="text-bearish-red mb-0.5">NO</span>
                  <span className="font-mono text-[9px] text-on-surface-variant font-bold">${activeMarket.noPrice.toFixed(2)}</span>
                </button>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-end mb-2 text-[9px]">
                  <span className="font-bold text-on-surface-variant uppercase tracking-widest font-mono">POSITION SIZE</span>
                  <span className="font-mono text-primary font-bold text-xs">${tradeSize}</span>
                </div>
                <input 
                  className="w-full h-1 bg-surface-variant rounded-full appearance-none cursor-pointer" 
                  max="5000" 
                  min="10" 
                  type="range" 
                  value={tradeSize}
                  onChange={(e) => setTradeSize(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2 mb-4 p-3 bg-surface-variant/30 rounded border border-outline-variant text-[10px]">
                <div className="flex justify-between font-bold">
                  <span className="text-on-surface-variant">Est. Shares</span>
                  <span className="text-on-surface font-mono">{estShares}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-bullish-green font-mono">${potentialPayout.toFixed(1)}</span>
                  <span className="text-on-surface-variant">Payout Potential</span>
                </div>
              </div>
              <button 
                className="w-full py-3 bg-primary text-white font-bold text-[10px] rounded hover:bg-primary/90 transition-all active:scale-[0.97] uppercase tracking-widest font-mono"
                onClick={() => alert(`Confirmed: Bought ${estShares} shares of ${selectedDirection} for $${tradeSize} USDC.`)}
              >
                CONFIRM POSITION
              </button>
            </div>

            {/* Live Sentiment chat logs */}
            <div className="sahara-panel rounded-xl flex-grow flex flex-col min-h-0 bg-surface overflow-hidden">
              <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between shrink-0">
                <h3 className="font-bold text-[9px] text-on-surface tracking-widest uppercase font-mono">LIVE CHAT</h3>
                <span className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest font-mono">2.4K WATCHING</span>
              </div>
              
              {/* Message scroll loop */}
              <div className="flex-grow p-4 space-y-4 overflow-y-auto min-h-0 scrollbar-thin col-snap-container">
                {messages.map((msg, index) => (
                  <div key={msg.id} className={`flex gap-3 col-snap-section ${index >= 2 ? 'opacity-65' : ''}`}>
                    {msg.type === 'bot' ? (
                      <div className="flex-shrink-0 w-7 h-7 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                        <span className="material-symbols-outlined text-sm text-primary">smart_toy</span>
                      </div>
                    ) : (
                      <img className="w-7 h-7 rounded object-cover border border-outline-variant shrink-0" src={msg.avatar} alt="User" />
                    )}
                    <div className="space-y-1 flex-grow text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[9px] text-primary tracking-widest uppercase font-mono">{msg.sender}</span>
                        <span className="text-[8px] font-bold text-on-surface-variant/50 font-mono">{msg.time}</span>
                      </div>
                      <p className={`leading-relaxed text-[11px] ${msg.type === 'bot' ? 'bg-surface-variant/40 p-2.5 rounded-lg rounded-tl-none border border-outline-variant' : 'text-on-surface'}`}>
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input form area */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-outline-variant bg-surface-variant/10 shrink-0">
                <div className="relative">
                  <input 
                    className="w-full bg-background border border-outline-variant rounded py-2 px-3 pr-10 text-xs focus:border-primary outline-none transition-all placeholder:text-on-surface-variant/50" 
                    placeholder="Share insight..." 
                    type="text"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                  />
                  <button type="submit" className="absolute right-3 top-2 text-primary">
                    <span className="material-symbols-outlined text-base">send</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 pb-safe bg-surface/95 backdrop-blur-xl border-t border-outline-variant shadow-lg">
        <button 
          className={`flex flex-col items-center gap-1 transition-all ${currentView === 'landing' ? 'text-primary font-bold' : 'text-on-surface-variant opacity-60'}`}
          onClick={() => setCurrentView('landing')}
        >
          <span className="material-symbols-outlined">explore</span>
          <span className="text-[9px] font-bold uppercase tracking-widest font-mono">Markets</span>
        </button>
        <button 
          className={`flex flex-col items-center gap-1 transition-all ${currentView === 'feed' ? 'text-primary font-bold' : 'text-on-surface-variant opacity-60'}`}
          onClick={() => setCurrentView('feed')}
        >
          <span className="material-symbols-outlined">explore</span>
          <span className="text-[9px] font-bold uppercase tracking-widest font-mono">Core Feed</span>
        </button>
        <button 
          className={`flex flex-col items-center gap-1 transition-all ${currentView === 'creator' ? 'text-primary font-bold' : 'text-on-surface-variant opacity-60'}`}
          onClick={() => setCurrentView('creator')}
        >
          <span className="material-symbols-outlined">smart_toy</span>
          <span className="text-[9px] font-bold uppercase tracking-widest font-mono">AI Creator</span>
        </button>
        <button 
          className={`flex flex-col items-center gap-1 transition-all ${currentView === 'terminal' ? 'text-primary font-bold' : 'text-on-surface-variant opacity-60'}`}
          onClick={() => setCurrentView('terminal')}
        >
          <span className="material-symbols-outlined">account_balance</span>
          <span className="text-[9px] font-bold uppercase tracking-widest font-mono">Terminal</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
