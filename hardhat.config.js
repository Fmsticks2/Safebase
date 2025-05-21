require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

module.exports = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    krnl: {
      url: process.env.KRNL_RPC_URL || 'https://mainnet.krnl.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1234
    },
    'krnl-testnet': {
      url: process.env.KRNL_TESTNET_RPC_URL || 'https://testnet.krnl.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 12345
    }
  },
  etherscan: {
    apiKey: {
      krnl: process.env.KRNLSCAN_API_KEY,
      'krnl-testnet': process.env.KRNLSCAN_API_KEY
    },
    customChains: [
      {
        network: 'krnl',
        chainId: 1234,
        urls: {
          apiURL: 'https://api.krnlscan.org/api',
          browserURL: 'https://krnlscan.org'
        }
      },
      {
        network: 'krnl-testnet',
        chainId: 12345,
        urls: {
          apiURL: 'https://api-testnet.krnlscan.org/api',
          browserURL: 'https://testnet.krnlscan.org'
        }
      }
    ]
  }
};