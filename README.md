# 🛡️ SafeBase - KRNL Network Deployment Tool

SafeBase provides tools for deploying and verifying smart contracts on the KRNL network with Python and Web3.py.

## 🚀 Features
- Compile Solidity contracts
- Deploy contracts to KRNL network
- Verify contracts on KRNL explorer
- Environment variable configuration

## 🧠 Powered By
- Python 3.x
- Web3.py for blockchain interactions
- Solcx for contract compilation
- Dotenv for environment management

## 🛠️ Tech Stack
- Python 3.x
- Web3.py
- Solcx
- Dotenv

## ⚙️ Setup Instructions

1. Clone the repo
```bash
git clone https://github.com/context7/safebase.git
cd safebase
```

2. Install dependencies
```bash
pip install -r requirements.txt
```

3. Configure environment variables
Create a `.env` file with:
```
KRNL_RPC_URL=your_krnl_rpc_url
DEPLOYER_PRIVATE_KEY=your_private_key
```

4. Run deployment script
```bash
python scripts/deploy_krnl.py path/to/contract.sol
```

## 📄 License
MIT
