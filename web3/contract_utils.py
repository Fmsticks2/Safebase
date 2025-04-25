from web3 import Web3
from typing import Dict, Any, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ContractAnalyzer:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(os.getenv('BASE_RPC_URL')))
        self.risky_opcodes = {
            'DELEGATECALL': '0xf4',
            'SELFDESTRUCT': '0xff'
        }

    def verify_contract(self, address: str) -> Dict[str, Any]:
        """Verify a smart contract's bytecode and recent transactions."""
        try:
            # Check if address is valid
            if not self.w3.is_address(address):
                return {
                    'is_valid': False,
                    'error': 'Invalid address format'
                }

            # Get contract bytecode
            bytecode = self.w3.eth.get_code(address).hex()
            if bytecode == '0x':
                return {
                    'is_valid': False,
                    'error': 'No contract code found'
                }

            # Check for risky opcodes
            risky_ops_found = []
            for op_name, op_code in self.risky_opcodes.items():
                if op_code in bytecode:
                    risky_ops_found.append(op_name)

            # Get recent transactions
            block_number = self.w3.eth.block_number
            recent_txs = []
            for i in range(10):  # Check last 10 blocks
                block = self.w3.eth.get_block(block_number - i, True)
                for tx in block.transactions:
                    if tx['to'] and tx['to'].lower() == address.lower():
                        recent_txs.append(tx)

            return {
                'is_valid': True,
                'bytecode_length': len(bytecode),
                'risky_operations': risky_ops_found,
                'recent_transactions': len(recent_txs),
                'creation_block': self.get_contract_creation_block(address)
            }

        except Exception as e:
            return {
                'is_valid': False,
                'error': str(e)
            }

    def get_contract_creation_block(self, address: str) -> Optional[int]:
        """Get the block number where the contract was created."""
        try:
            # Binary search for contract creation
            left = 0
            right = self.w3.eth.block_number

            while left <= right:
                mid = (left + right) // 2
                code = self.w3.eth.get_code(address, mid)
                prev_code = self.w3.eth.get_code(address, mid - 1) if mid > 0 else b''

                if len(code) > 0 and len(prev_code) == 0:
                    return mid
                elif len(code) == 0:
                    left = mid + 1
                else:
                    right = mid - 1

            return None

        except Exception:
            return None

    def analyze_transaction_patterns(self, address: str) -> Dict[str, Any]:
        """Analyze transaction patterns for suspicious activity."""
        try:
            # Get recent transactions
            block_number = self.w3.eth.block_number
            transactions = []
            unique_senders = set()
            total_value = 0

            # Analyze last 100 blocks
            for i in range(100):
                block = self.w3.eth.get_block(block_number - i, True)
                for tx in block.transactions:
                    if tx['to'] and tx['to'].lower() == address.lower():
                        transactions.append(tx)
                        unique_senders.add(tx['from'])
                        total_value += tx['value']

            return {
                'transaction_count': len(transactions),
                'unique_senders': len(unique_senders),
                'total_value_wei': total_value,
                'total_value_eth': self.w3.from_wei(total_value, 'ether'),
                'avg_value_eth': self.w3.from_wei(total_value / len(transactions) if transactions else 0, 'ether')
            }

        except Exception as e:
            return {
                'error': str(e)
            }