from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from web3 import Web3
import openai
from datetime import datetime
from web3.contract_utils import ContractAnalyzer

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

# Configure Web3 and ContractAnalyzer
w3 = Web3(Web3.HTTPProvider(os.getenv('BASE_RPC_URL')))
contract_analyzer = ContractAnalyzer()

def analyze_contract(address):
    """Analyze a smart contract address for potential scams."""
    try:
        # Use ContractAnalyzer for detailed analysis
        verification = contract_analyzer.verify_contract(address)
        
        if not verification['is_valid']:
            return {
                'verdict': 'Suspicious',
                'risk_score': 0.8,
                'explanation': verification['error']
            }
        
        # Analyze transaction patterns
        tx_patterns = contract_analyzer.analyze_transaction_patterns(address)
        
        # Calculate risk score based on multiple factors
        risk_score = 0.5  # Default moderate risk
        
        # Adjust score based on risky operations
        if verification['risky_operations']:
            risk_score += 0.3
        
        # Adjust score based on transaction patterns
        if tx_patterns.get('transaction_count', 0) > 0:
            if tx_patterns.get('unique_senders', 0) / tx_patterns['transaction_count'] < 0.2:
                risk_score += 0.2  # Few unique senders relative to transactions is suspicious
        
        # Use OpenAI for additional analysis
        analysis_prompt = f"Analyze this smart contract for potential scam indicators:\n"\
                         f"Bytecode length: {verification['bytecode_length']}\n"\
                         f"Risky operations: {', '.join(verification['risky_operations'])}\n"\
                         f"Recent transactions: {verification['recent_transactions']}\n"\
                         f"Transaction patterns: {tx_patterns}"

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a blockchain security expert analyzing smart contracts for potential scams."},
                {"role": "user", "content": analysis_prompt}
            ]
        )

        analysis = response.choices[0].message.content
        
        # Determine verdict based on risk score
        verdict = 'Safe' if risk_score < 0.3 else 'Suspicious' if risk_score < 0.7 else 'Likely Scam'

        return {
            'verdict': verdict,
            'risk_score': risk_score,
            'explanation': analysis[:200],  # Truncate to first 200 characters
            'details': {
                'verification': verification,
                'transaction_patterns': tx_patterns
            }
        }

    except Exception as e:
        return {
            'verdict': 'Error',
            'risk_score': 0.5,
            'explanation': f'Error analyzing contract: {str(e)}'
        }

def analyze_url(url):
    """Analyze a URL for potential phishing or scam indicators."""
    try:
        # Use OpenAI to analyze the URL
        analysis_prompt = f"Analyze this URL {url} for potential scam/phishing indicators. Consider:"\
                         f"1. Domain reputation and age"\
                         f"2. Similar legitimate domains"\
                         f"3. Common phishing patterns"

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a cybersecurity expert analyzing URLs for potential scams and phishing attempts."},
                {"role": "user", "content": analysis_prompt}
            ]
        )

        # Process OpenAI's analysis
        analysis = response.choices[0].message.content
        
        # Simple scoring based on keywords
        risk_score = 0.5  # Default moderate risk
        if 'legitimate' in analysis.lower():
            risk_score -= 0.3
        if 'suspicious' in analysis.lower() or 'phishing' in analysis.lower():
            risk_score += 0.3

        # Determine verdict based on risk score
        verdict = 'Safe' if risk_score < 0.3 else 'Suspicious' if risk_score < 0.7 else 'Likely Scam'

        return {
            'verdict': verdict,
            'risk_score': risk_score,
            'explanation': analysis[:200]  # Truncate to first 200 characters
        }

    except Exception as e:
        return {
            'verdict': 'Error',
            'risk_score': 0.5,
            'explanation': f'Error analyzing URL: {str(e)}'
        }

# Initialize watchlist storage
watchlist = {}

@app.route('/api/monitor/list', methods=['GET'])
def get_watchlist():
    try:
        return jsonify({
            'status': 'success',
            'data': watchlist
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving watchlist: {str(e)}'
        }), 500

@app.route('/api/monitor/add', methods=['POST'])
def add_to_watchlist():
    data = request.get_json()
    address = data.get('address')
    
    if not address:
        return jsonify({'status': 'error', 'message': 'No address provided'}), 400
        
    watchlist[address] = {
        'added_at': str(datetime.now()),
        'notifications': True,
        'alerts': []
    }
    
    return jsonify({'status': 'success'})

@app.route('/api/monitor/remove', methods=['POST'])
def remove_from_watchlist():
    data = request.get_json()
    address = data.get('address')
    
    if not address:
        return jsonify({'status': 'error', 'message': 'No address provided'}), 400
        
    if address in watchlist:
        del watchlist[address]
        
    return jsonify({'status': 'success'})

@app.route('/api/check', methods=['POST'])
def check():
    data = request.get_json()
    input_value = data.get('input', '').strip()

    if not input_value:
        return jsonify({
            'error': 'No input provided'
        }), 400

    # Determine if input is a contract address or URL
    if input_value.startswith('0x'):
        result = analyze_contract(input_value)
    else:
        result = analyze_url(input_value)

    return jsonify(result)

if __name__ == '__main__':
    app.run(host=os.getenv('HOST', '0.0.0.0'),
            port=int(os.getenv('PORT', 5000)),
            debug=os.getenv('FLASK_DEBUG', True))