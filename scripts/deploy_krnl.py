import os
from web3 import Web3
from dotenv import load_dotenv
import json
import time

# Load environment variables
load_dotenv()

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(os.getenv('KRNL_RPC_URL')))
private_key = os.getenv('DEPLOYER_PRIVATE_KEY')

if not private_key:
    raise ValueError("No private key provided in environment variables")

account = w3.eth.account.from_key(private_key)


def compile_contract(contract_path):
    """Compile a Solidity contract using solcx."""
    from solcx import compile_files
    
    # Compile the contract
    compiled = compile_files([contract_path], output_values=['abi', 'bin'])
    
    # Get the contract data
    contract_key = next(key for key in compiled.keys() if key.endswith(contract_path))
    contract_data = compiled[contract_key]
    
    return {
        'abi': contract_data['abi'],
        'bytecode': contract_data['bin']
    }


def deploy_contract(abi, bytecode, constructor_args=None):
    """Deploy a compiled contract to KRNL network."""
    # Create contract instance
    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    
    # Build transaction
    tx = contract.constructor(*(constructor_args or [])).build_transaction({
        'chainId': w3.eth.chain_id,
        'gas': 2000000,
        'gasPrice': w3.eth.gas_price,
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address)
    })
    
    # Sign transaction
    signed_tx = w3.eth.account.sign_transaction(tx, private_key)
    
    # Send transaction
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    return tx_receipt.contractAddress


def verify_contract(address, abi, source_code):
    """Verify contract on KRNL explorer."""
    # This would typically use the explorer's API
    print(f"Contract deployed at {address}. Please verify manually on KRNL explorer.")
    return True


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Deploy smart contracts to KRNL network')
    parser.add_argument('contract_path', help='Path to Solidity contract file')
    parser.add_argument('--verify', action='store_true', help='Verify contract after deployment')
    
    args = parser.parse_args()
    
    print(f"Compiling contract: {args.contract_path}")
    compiled = compile_contract(args.contract_path)
    
    print("Deploying contract...")
    contract_address = deploy_contract(compiled['abi'], compiled['bytecode'])
    
    print(f"Contract successfully deployed at: {contract_address}")
    
    if args.verify:
        print("Verifying contract...")
        with open(args.contract_path, 'r') as f:
            source_code = f.read()
        verify_contract(contract_address, compiled['abi'], source_code)