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

// devnetfaucet.org API airdrop
async function airdropFaucetOrg(address, amount) {
  try {
    // Convert SOL to lamports
    const lamports = Math.floor(amount * 1e9);
    const response = await axios.post('https://faucet-server.v1.devnet.solana.com/', {
      jsonrpc: '2.0',
      id: 1,
      method: 'requestAirdrop',
      params: [address, lamports],
    }, {
      validateStatus: s => s < 500,
      timeout: 30000,
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
  const rpcArg = rpc ? ` -u "${rpc}"` : '';
  try {
    const cmd = `solana airdrop ${amount / 1e9} ${address}${rpcArg}`;
    execSync(cmd, { encoding: 'utf8' });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// PoW faucet - check if available and run
async function airdropPow(address) {
  const { execSync, spawn } = require('child_process');
  
  // Check if devnet-pow is installed (try both PATH and ~/.cargo/bin)
  let powPath = 'devnet-pow';
  try {
    execSync('which devnet-pow', { encoding: 'utf8' });
  } catch (e) {
    // Try ~/.cargo/bin
    try {
      execSync('test -x ~/.cargo/bin/devnet-pow', { encoding: 'utf8' });
      powPath = process.env.HOME + '/.cargo/bin/devnet-pow';
    } catch (e2) {
      return { 
        success: false, 
        error: 'devnet-pow not installed. Install with: cargo install devnet-pow',
        installHint: true
      };
    }
  }
  
  // Run devnet-pow
  // Note: PoW mines to a newly generated keypair, not directly to an address
  try {
    console.log('⛏️  Starting PoW mining (this generates a new keypair)...');
    console.log('   Note: SOL will be mined to a new keypair, not the provided address.');
    console.log('   After mining, you can transfer SOL from the generated keypair.\n');
    
    const proc = spawn(powPath, ['mine', '--target-lamports', '10000000000'], {
      stdio: 'inherit'
    });
    
    return new Promise((resolve) => {
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, note: 'PoW mining completed. Check terminal for generated keypair info.' });
        } else {
          resolve({ success: false, error: `PoW process exited with code ${code}` });
        }
      });
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Check balance
async function checkBalance(address, rpcUrl) {
  try {
    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address],
    }, {
      validateStatus: s => s < 500,
    });
    
    if (response.data.error) {
      return null;
    }
    return response.data.result?.value || 0;
  } catch (e) {
    return null;
  }
}

const argv = yargs
  .option('address', {
    alias: 'a',
    description: 'Solana address to receive airdrop',
    type: 'string',
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
    description: 'Method: rpc, cli, pow, faucet',
    default: 'rpc',
    type: 'string',
  })
  .option('helius', {
    alias: 'H',
    description: 'Use Helius RPC (provide API key or true for env var)',
    type: 'string',
  })
  .option('balance', {
    alias: 'b',
    description: 'Check balance only',
    type: 'boolean',
    default: false,
  })
  .help()
  .alias('help', 'h')
  .argv;

// Main
async function main() {
  let { address, rpc, network, amount, method, helius, balance } = argv;
  
  // If no address provided, show help
  if (!address && !balance) {
    yargs.showHelp();
    console.log('\n💡 Examples:');
    console.log('   avi-faucet -a <ADDRESS>                    # RPC airdrop');
    console.log('   avi-faucet -a <ADDRESS> -H YOUR_KEY       # Helius RPC');
    console.log('   avi-faucet -a <ADDRESS> -x pow              # PoW mining');
    console.log('   avi-faucet -b -a <ADDRESS>                 # Check balance');
    process.exit(0);
  }
  
  // Determine RPC URL
  let rpcUrl = rpc || NETWORKS[network];
  
  // Handle helius flag
  if (helius) {
    // If helius is 'true', try to get from env
    let heliusKey = helius;
    if (helius === 'true') {
      heliusKey = process.env.HELIUS_API_KEY;
    }
    if (!heliusKey) {
      console.error('Error: Helius API key required. Provide via -H or set HELIUS_API_KEY env var');
      process.exit(1);
    }
    rpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusKey}`;
  }
  
  // Check balance mode
  if (balance) {
    if (!address) {
      console.error('Error: --balance requires --address');
      process.exit(1);
    }
    console.log(`🔍 Checking balance for ${address}...`);
    const bal = await checkBalance(address, rpcUrl);
    if (bal !== null) {
      console.log(`   Balance: ${bal / 1e9} SOL`);
    } else {
      console.log('   Error fetching balance');
    }
    return;
  }
  
  // Validate address
  if (!isValidAddress(address)) {
    console.error('Error: Invalid Solana address');
    process.exit(1);
  }
  
  const lamports = amount * 1e9;
  
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
      console.log('📝 Using Solana CLI...');
      result = airdropCli(address, rpcUrl, lamports);
      break;
    case 'pow':
      console.log('⛏️  Using PoW faucet...');
      result = await airdropPow(address);
      break;
    case 'faucet':
      console.log('🌊 Using faucet.solana.com...');
      result = await airdropFaucetOrg(address, amount);
      break;
    default:
      console.log('🌐 Using RPC...');
      result = await airdropRpc(address, rpcUrl, lamports);
  }
  
  if (result.success) {
    console.log(`✅ Success!`);
    if (result.signature) {
      console.log(`   Signature: ${result.signature}`);
    }
  } else {
    console.log(`❌ Failed: ${result.error}`);
    if (result.installHint) {
      console.log('\n💡 To install devnet-pow:');
      console.log('   cargo install devnet-pow');
    }
    process.exit(1);
  }
}

main();
