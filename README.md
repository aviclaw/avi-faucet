# avi-faucet 🦞

CLI for Solana devnet/testnet faucets — RPC, Helius, and faucet.solana.com.

## Install

```bash
npm install -g aviclaw/avi-faucet
```

Or run directly:
```bash
npx aviclaw/avi-faucet --address <ADDR>
```

## Usage

### Quick Start

```bash
# Check balance
avi-faucet -b -a <ADDRESS>

# Request airdrop (default: RPC)
avi-faucet -a <ADDRESS>
```

### Methods

#### 1. Direct RPC (default)
```bash
avi-faucet -a <ADDRESS>
```

#### 2. Helius RPC (recommended)
```bash
# With API key
avi-faucet -a <ADDRESS> -H YOUR_API_KEY

# From environment variable
avi-faucet -a <ADDRESS> -H true
```

#### 3. Solana CLI
```bash
# Requires Solana CLI installed
avi-faucet -a <ADDRESS> -x cli
```

#### 4. faucet.solana.com (2 requests/8hrs)
```bash
avi-faucet -a <ADDRESS> -x faucet
```

> Note: faucet.solana.com falls back to RPC if the web faucet is unavailable.

## Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--address` | `-a` | (required) | Solana address |
| `--balance` | `-b` | false | Check balance only |
| `--network` | `-n` | devnet | Network: devnet, testnet |
| `--rpc` | `-r` | (auto) | Custom RPC URL |
| `--helius` | `-H` | - | Helius API key |
| `--amount` | `-m` | 5 | Amount in SOL |
| `--method` | `-x` | rpc | Method: rpc, faucet, cli |

## Rate Limits

| Method | Limit |
|--------|-------|
| Solana public RPC | ~5 SOL/day |
| Helius (free) | 1 SOL/day |
| Helius (paid) | Varies |
| Solana CLI | Uses RPC rate limits |
| faucet.solana.com | 2 requests/8 hours |

## Environment Variables

```bash
# For Helius
export HELIUS_API_KEY="your-key"

# Then use:
avi-faucet -a <ADDRESS> -H true
```

## For Agents

Use programmatically:

```javascript
const { execSync } = require('child_process');

function requestAirdrop(address, options = {}) {
  const args = ['-a', address];
  if (options.helius) args.push('-H', options.helius);
  if (options.amount) args.push('-m', options.amount);
  
  const result = execSync(`avi-faucet ${args.join(' ')}`, { encoding: 'utf8' });
  return result;
}

// Example
requestAirdrop('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', { helius: 'YOUR_KEY' });
```

## Security Notes

- Never commit API keys
- Use environment variables for secrets
- Rate limits protect from abuse
- Solana addresses validated before sending

## License

MIT