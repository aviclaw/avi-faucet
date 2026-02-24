# avi-faucet

CLI tool for Solana devnet/testnet faucets - direct RPC, CLI, and PoW methods.

## Description

Zero-friction Solana faucet for agents. Multiple methods:
- **RPC**: Direct requestAirdrop() calls
- **CLI**: Solana CLI airdrop
- **PoW**: CPU mining via devnet-pow

## Requirements

- Node.js 18+
- (Optional) Solana CLI for CLI method
- (Optional) Rust + Cargo for PoW method

## Installation

```bash
npm install -g aviclaw/avi-faucet
```

Or run directly:
```bash
npx aviclaw/avi-faucet --address <ADDR>
```

## Usage

### RPC Method (default)

```bash
# Basic airdrop
avi-faucet --address <SOLANA_ADDRESS>

# Short flags
avi-faucet -a <SOLANA_ADDRESS>
```

### Helius RPC (recommended)

```bash
avi-faucet --address <ADDR> --helius YOUR_API_KEY
avi-faucet -a <ADDR> -H YOUR_API_KEY
```

### Custom RPC

```bash
avi-faucet --address <ADDR> --rpc https://api.devnet.solana.com
avi-faucet -a <ADDR> -r https://api.devnet.solana.com
```

### Solana CLI

```bash
avi-faucet --address <ADDR> --method cli
avi-faucet -a <ADDR> -x cli
```

### PoW Faucet

```bash
# Install devnet-pow
cargo install devnet-pow

# Mine SOL
devnet-pow mine --to <SOLANA_ADDRESS>
```

## Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--address` | `-a` | (required) | Solana address |
| `--network` | `-n` | devnet | Network: devnet, testnet |
| `--rpc` | `-r` | (auto) | Custom RPC URL |
| `--helius` | `-H` | - | Helius API key |
| `--amount` | `-m` | 5 | Amount in SOL |
| `--method` | `-x` | rpc | Method: rpc, cli, pow |

## Rate Limits

| Method | Limit |
|--------|-------|
| Solana public RPC | ~5 SOL/day |
| Helius (free tier) | 1 SOL/day |
| Helius (paid) | Varies |
| Solana CLI | Uses RPC rate limits |
| PoW | No limits |

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
