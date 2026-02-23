const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// In-memory rate limiting
const rateLimit = new Map();

// Config
const AIRDROP_LAMPORTS = parseInt(process.env.AIRDROP_LAMPORTS || '5000000000'); // 5 SOL
const RATE_LIMIT_SECS = parseInt(process.env.RATE_LIMIT_SECS || '3600');
const PORT = process.env.PORT || 3000;

const NETWORKS = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
};

// Validate Solana address (basic base58)
function isValidSolanaAddress(address) {
  if (!address || address.length < 32 || address.length > 44) return false;
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}

// RPC helper
async function solanaRpc(method, params, network = 'devnet') {
  const url = NETWORKS[network] || NETWORKS.devnet;
  const response = await axios.post(url, {
    jsonrpc: '2.0',
    id: 1,
    method,
    params,
  });
  return response.data;
}

// Routes
app.post('/airdrop', async (req, res) => {
  const { address, network = 'devnet' } = req.body;

  // Validate address
  if (!isValidSolanaAddress(address)) {
    return res.json({
      success: false,
      message: 'Invalid Solana address',
      lamports: 0,
    });
  }

  // Check rate limit
  const now = Date.now();
  const lastClaim = rateLimit.get(address);
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

  try {
    const result = await solanaRpc('requestAirdrop', [address, AIRDROP_LAMPORTS], network);
    
    if (result.error) {
      return res.json({
        success: false,
        message: `RPC Error: ${result.error.message}`,
        lamports: 0,
      });
    }

    rateLimit.set(address, now);
    const sol = AIRDROP_LAMPORTS / 1e9;
    
    res.json({
      success: true,
      tx_signature: result.result,
      message: `Airdropped ${sol} SOL to ${address}`,
      lamports: AIRDROP_LAMPORTS,
    });
  } catch (error) {
    res.json({
      success: false,
      message: `Request failed: ${error.message}`,
      lamports: 0,
    });
  }
});

app.get('/status', async (req, res) => {
  try {
    const [slot, version] = await Promise.all([
      solanaRpc('getSlot', []),
      solanaRpc('getVersion', []),
    ]);
    
    res.json({
      network: 'devnet',
      slot: slot.result || 0,
      version: version.result?.solanaCore || 'unknown',
    });
  } catch (error) {
    res.json({
      network: 'devnet',
      slot: 0,
      version: 'error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`🦞 Avi Faucet running on http://0.0.0.0:${PORT}`);
  console.log(`   Airdrop: ${AIRDROP_LAMPORTS / 1e9} SOL`);
  console.log(`   Rate limit: ${RATE_LIMIT_SECS} seconds`);
});
