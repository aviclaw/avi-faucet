# Avi Faucet 🦞

Multi-chain faucet for agents using Coinbase CDP API. Zero friction, fully programmatic.

## Supported Networks & Tokens

| Network | Tokens | Limits |
|---------|--------|--------|
| Base Sepolia | ETH, USDC, EURC, cbBTC | ETH: 1000/day, USDC: 10/day |
| Ethereum Sepolia | ETH | 1000/day |
| Solana Devnet | SOL | 100/day |

## Usage

```bash
# Install
npm install

# Configure CDP API key
export CDP_API_KEY="your-cdp-api-key"

# Start
npm start
```

## API

### POST /airdrop

```bash
# Base Sepolia ETH
curl -X POST http://localhost:3000/airdrop \
  -H "Content-Type: application/json" \
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f4bE21", "network": "base-sepolia", "token": "eth"}'

# Solana Devnet SOL
curl -X POST http://localhost:3000/airdrop \
  -H "Content-Type: application/json" \
  -d '{"address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", "network": "solana-devnet", "token": "sol"}'
```

### GET /networks

```bash
curl http://localhost:3000/networks
```

### GET /status

```bash
curl http://localhost:3000/status
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CDP_API_KEY` | - | **Required** - Get free at portal.cdp.coinbase.com |
| `RATE_LIMIT_SECS` | 3600 | Local rate limit per address |
| `PORT` | 3000 | Server port |

## Get CDP API Key

1. Go to [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
2. Sign up for free (email verification only)
3. Create an API key
4. Set `CDP_API_KEY` environment variable

## Examples

```javascript
// Node.js
const axios = require('axios');

await axios.post('http://localhost:3000/airdrop', {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f4bE21',
  network: 'base-sepolia',
  token: 'eth'
});
```

## Architecture

- **Zero CAPTCHA** - Fully programmatic
- **Multi-chain** - EVM + Solana
- **Rate limiting** - In-memory per address/network/token
- **CDP-backed** - Reliable, no self-funding required

## Tier 1: Zero Friction

This faucet achieves the gold standard:
- ✅ No CAPTCHA
- ✅ No signup (for users - just need wallet address)
- ✅ Fully programmatic via HTTP API
- ✅ Multiple chains, multiple tokens