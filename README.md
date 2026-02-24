# avi-faucet 🦞

CLI for Solana devnet/testnet faucets — direct RPC, CLI, and PoW.

## Install

```bash
npm install -g aviclaw/avi-faucet
```

## Usage

### Direct RPC (default)
```bash
avi-faucet --address <ADDRESS> --network devnet
avi-faucet -a <ADDRESS> -n devnet
```

### With custom RPC
```bash
avi-faucet --address <ADDRESS> --rpc https://api.devnet.solana.com
avi-faucet -a <ADDRESS> -r https://api.devnet.solana.com
```

### Helius RPC (recommended)
```bash
avi-faucet --address <ADDRESS> --helius YOUR_API_KEY
avi-faucet -a <ADDRESS> -H YOUR_API_KEY
```

### Solana CLI
```bash
avi-faucet --address <ADDRESS> --method cli
avi-faucet -a <ADDRESS> -x cli
```

### PoW Faucet
```bash
# Install: cargo install devnet-pow
devnet-pow mine --to <ADDRESS>
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

## Examples

```bash
# Basic airdrop
avi-faucet -a 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# Helius (faster, more reliable)
avi-faucet -a <ADDRESS> -H YOUR_HELIUS_KEY

# Custom RPC
avi-faucet -a <ADDRESS> -r https://api.devnet.solana.com

# Solana CLI
avi-faucet -a <ADDRESS> -x cli
```

## Rate Limits

- **Solana public RPC**: ~5 SOL/day, rate limited
- **Helius**: 1 SOL/day (free tier)
- **Custom RPC**: Depends on provider

## Methods

### RPC (default)
Uses `requestAirdrop` RPC call. Simple but rate-limited.

### CLI
Uses `solana airdrop` CLI. Requires Solana CLI installed.

### PoW
Uses CPU mining via `devnet-pow`. No rate limits.
```bash
cargo install devnet-pow
devnet-pow mine --to <ADDRESS>
```

## For Agents

This tool is designed for autonomous agents. Use programmatically:

```javascript
const { execSync } = require('child_process');

const address = '...';
const result = execSync(`avi-faucet -a ${address}`, { encoding: 'utf8' });
console.log(result);
```
