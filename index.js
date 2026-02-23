const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// In-memory rate limiting
const rateLimit = new Map();

// Config
const CDP_API_KEY = process.env.CDP_API_KEY;
const RATE_LIMIT_SECS = parseInt(process.env.RATE_LIMIT_SECS || '3600');
const PORT = process.env.PORT || 3000;

// Supported networks and tokens
const NETWORKS = {
  'base-sepolia': { chain: 'base', network: 'base-sepolia' },
  'ethereum-sepolia': { chain: 'eth', network: 'eth-mainnet' }, // Actually uses "eth-mainnet" in CDP for Sepolia
  'solana-devnet': { chain: 'sol', network: 'solana-devnet' },
};

const TOKENS = ['eth', 'usdc', 'eurc', 'cbbtc', 'sol'];

// Token info: [claims/day, amount per claim]
const TOKEN_LIMITS = {
  eth: { daily: 1000, amount: '0.0001 ETH' },
  usdc: { daily: 10, amount: '1 USDC' },
  eurc: { daily: 10, amount: '1 EURC' },
  cbbtc: { daily: 100, amount: '0.000001 cbBTC' },
  sol: { daily: 100, amount: '0.5 SOL' },
};

// Validate address by chain type
function validateAddress(address, chain) {
  if (!address) return false;
  
  if (chain === 'sol') {
    // Solana: base58, 32-44 chars
    return address.length >= 32 && address.length <= 44 && 
           /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
  } else {
    // EVM: 0x + 40 hex chars
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

// Make CDP API request
async function requestFaucet(address, network, token) {
  const net = NETWORKS[network];
  if (!net) {
    throw new Error(`Unsupported network: ${network}`);
  }

  const url = 'https://api.cdp.coinbase.com/wallet/v1/faucet/request';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CDP_API_KEY}`,
    },
    body: JSON.stringify({
      address,
      network: net.network,
      token,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  
  return data;
}

// Routes
app.post('/airdrop', async (req, res) => {
  const { address, network = 'base-sepolia', token = 'eth' } = req.body;
  
  console.log(`[AIRDROP] request: address=${address}, network=${network}, token=${token}`);

  // Validate inputs
  const net = NETWORKS[network];
  if (!net) {
    return res.json({
      success: false,
      message: `Invalid network. Supported: ${Object.keys(NETWORKS).join(', ')}`,
      lamports: 0,
    });
  }

  if (!TOKENS.includes(token)) {
    return res.json({
      success: false,
      message: `Invalid token. Supported: ${TOKENS.join(', ')}`,
      lamports: 0,
    });
  }

  if (!validateAddress(address, net.chain)) {
    return res.json({
      success: false,
      message: `Invalid ${net.chain === 'sol' ? 'Solana' : 'EVM'} address`,
      lamports: 0,
    });
  }

  // Check rate limit (local)
  const now = Date.now();
  const key = `${address}:${network}:${token}`;
  const lastClaim = rateLimit.get(key);
  if (lastClaim) {
    const elapsed = (now - lastClaim) / 1000;
    if (elapsed < RATE_LIMIT_SECS) {
      const remaining = Math.ceil(RATE_LIMIT_SECS - elapsed);
      return res.json({
        success: false,
        message: `Rate limited. Try again in ${remaining} seconds`,
        lamports: 0,
      });
    }
  }

  // Check if CDP API key is configured
  if (!CDP_API_KEY) {
    return res.json({
      success: false,
      message: 'CDP_API_KEY not configured. Set it in environment variables.',
      lamports: 0,
    });
  }

  try {
    const result = await requestFaucet(address, network, token);
    
    rateLimit.set(key, now);
    
    res.json({
      success: true,
      tx_hash: result.tx_hash || result.transactionHash || 'pending',
      message: `Airdropped ${TOKEN_LIMITS[token].amount} to ${address} on ${network}`,
      network,
      token,
    });
  } catch (error) {
    console.log(`[ERROR] ${error.message}`);
    res.json({
      success: false,
      message: error.message,
      lamports: 0,
    });
  }
});

app.get('/networks', (req, res) => {
  res.json({
    networks: Object.keys(NETWORKS),
    tokens: TOKENS,
    limits: TOKEN_LIMITS,
  });
});

app.get('/status', (req, res) => {
  res.json({
    cdp_configured: !!CDP_API_KEY,
    network: 'online',
    supported_networks: Object.keys(NETWORKS),
  });
});

app.listen(PORT, () => {
  console.log(`🦞 Avi Faucet running on http://0.0.0.0:${PORT}`);
  console.log(`   Networks: ${Object.keys(NETWORKS).join(', ')}`);
  console.log(`   Tokens: ${TOKENS.join(', ')}`);
  console.log(`   Rate limit: ${RATE_LIMIT_SECS} seconds`);
  console.log(`   CDP API: ${CDP_API_KEY ? 'configured' : 'NOT CONFIGURED'}`);
});