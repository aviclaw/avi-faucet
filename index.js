#!/usr/bin/env node
const yargs = require('yargs');
const axios = require('axios');

const NETWORKS = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
};

const AIRDROP_AMOUNT = 5000000000; // 5 SOL default

// Validate Solana address
function isValidAddress(addr) {
  if (!addr || addr.length < 32 || addr.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr);
}

// Direct RPC airdrop
async function airdropRpc(address, rpcUrl, amount) {
  try {
    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'requestAirdrop',
      params: [address, amount],
    }, {
      validateStatus: s => s < 500,
    });
    
    if (response.data.error) {
      return { success: false, error: response.data.error.message };
    }
    return { success: true, signature: response.data.result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Solana CLI airdrop
function airdropCli(address, rpc, amount) {
  const { execSync } = require('child_process');
  try {
    const cmd = `solana airdrop ${amount / 1e9} ${address}${rpc ? ` -u "${rpc}"' : ''}`;
    execSync(cmd, { encoding: 'utf8' });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// PoW faucet
async function airdropPow(address) {
  // Would use devnet-pow tool - placeholder for now
  return { success: false, error: 'PoW faucet: run `devnet-pow mine --to ${address}`' };
}

const argv = yargs
  .option('address', {
    alias: 'a',
    description: 'Solana address to receive airdrop',
    type: 'string',
    demandOption: true,
  })
  .option('rpc', {
    alias: 'r',
    description: 'Custom RPC URL (optional)',
    type: 'string',
  })
  .option('network', {
    alias: 'n',
    description: 'Network: devnet or testnet',
    default: 'devnet',
    type: 'string',
  })
  .option('amount', {
    alias: 'm',
    description: 'Amount in SOL (default: 5)',
    default: 5,
    type: 'number',
  })
  .option('method', {
    alias: 'x',
    description: 'Method: rpc, cli, or pow',
    default: 'rpc',
    type: 'string',
  })
  .option('helius', {
    alias: 'H',
    description: 'Use Helius RPC (requires API key)',
    type: 'string',
  })
  .help()
  .alias('help', 'h')
  .argv;

// Main
async function main() {
  const { address, rpc, network, amount, method, helius } = argv;
  
  if (!isValidAddress(address)) {
    console.error('Error: Invalid Solana address');
    process.exit(1);
  }
  
  const lamports = amount * 1e9;
  
  // Determine RPC
  let rpcUrl = rpc || NETWORKS[network];
  if (helius) {
    rpcUrl = `https://devnet.helius-rpc.com/?api-key=${helius}`;
  }
  
  console.log(`🦞 Avi Faucet`);
  console.log(`   Address: ${address}`);
  console.log(`   Network: ${network}`);
  console.log(`   RPC: ${rpcUrl}`);
  console.log(`   Amount: ${amount} SOL`);
  console.log(`   Method: ${method}`);
  console.log('');
  
  let result;
  
  switch (method) {
    case 'cli':
      result = airdropCli(address, rpcUrl, lamports);
      break;
    case 'pow':
      result = await airdropPow(address);
      break;
    default:
      result = await airdropRpc(address, rpcUrl, lamports);
  }
  
  if (result.success) {
    console.log(`✅ Success!`);
    if (result.signature) {
      console.log(`   Signature: ${result.signature}`);
    }
  } else {
    console.log(`❌ Failed: ${result.error}`);
    process.exit(1);
  }
}

main();
