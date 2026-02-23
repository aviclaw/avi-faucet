# 🦞 Avi Faucet

Zero-friction Solana devnet/testnet faucet for agents.

## Usage

```bash
# Install dependencies
npm install

# Start the server
npm start

# Or with custom config
AIRDROP_LAMPORTS=1000000000 RATE_LIMIT_SECS=7200 npm start
```

## API

### POST /airdrop

Request airdrop to a Solana address.

```bash
curl -X POST http://localhost:3000/airdrop \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_SOLANA_ADDRESS", "network": "devnet"}'
```

Response:
```json
{
  "success": true,
  "tx_signature": "3xXx...",
  "message": "Airdropped 5 SOL to YOUR_ADDRESS",
  "lamports": 5000000000
}
```

### GET /status

Get network status.

```bash
curl http://localhost:3000/status
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AIRDROP_LAMPORTS` | 5000000000 | Airdrop amount in lamports (5 SOL) |
| `RATE_LIMIT_SECS` | 3600 | Rate limit per address in seconds |
| `PORT` | 3000 | Server port |

## Architecture

- **Zero CAPTCHA** - Fully programmatic
- **Rate limiting** - In-memory per-address
- **Multi-network** - devnet + testnet support

## Tier 1: Zero Friction

This faucet follows the gold standard:

```bash
solana airdrop 2
```

Via web3.js: `connection.requestAirdrop(pubkey, lamports)`

This service wraps `requestAirdrop()` in Express for agent-friendly HTTP API.
