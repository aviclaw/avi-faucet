# avi-faucet 🦞

CLI for Solana devnet/testnet faucets — direct RPC, CLI, and PoW methods.

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
avi-faucet -a <ADDRESS> --method cli
```

#### 4. PoW Faucet (no rate limits!)
```bash
# Install dependencies:
cargo install devnet-pow
sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"  # Solana CLI

# Configure Solana CLI:
solana config set --url https://api.devnet.solana.com

# Then mine SOL (generates new keypair):
avi-faucet -a <ADDRESS> --method pow
```

> **Note**: PoW mining generates a new keypair and mines SOL to it. After mining completes, transfer SOL to your target address.

## Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--address` | `-a` | (required) | Solana address |
| `--balance` | `-b` | false | Check balance only |
| `--network` | `-n` | devnet | Network: devnet, testnet |
| `--rpc` | `-r` | (auto) | Custom RPC URL |
| `--helius` | `-H` | - | Helius API key |
| `--amount` | `-m` | 5 | Amount in SOL |
| `--method` | `-x` | rpc | Method: rpc, cli, pow |

## Rate Limits

| Method | Limit |
|--------|-------|
| Solana public RPC | ~5 SOL/day |
| Helius (free) | 1 SOL/day |
| Helius (paid) | Varies |
| Solana CLI | Uses RPC rate limits |
| PoW | **No limits!** |

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
