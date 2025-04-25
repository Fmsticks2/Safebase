from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from web3 import Web3
import openai

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

# Configure Web3
w3 = Web3(Web3.HTTPProvider(os.getenv('BASE_RPC_URL')))

def analyze_contract(address):
    """Analyze a smart contract address for potential scams."""
    try:
        # Basic contract verification
        if not w3.is_address(address):
            return {
                'verdict': 'Suspicious',
                'risk_score': 0.8,
                'explanation': 'Invalid Ethereum address format.'
            }

        # Get contract code
        code = w3.eth.get_code(address)
        if len(code) == 0:
            return {
                'verdict': 'Suspicious',
                'risk_score': 0.7,
                'explanation': 'No contract code found at this address.'
            }

        # Use OpenAI to analyze the contract
        analysis_prompt = f"Analyze this smart contract address {address} for potential scam indicators. Consider:"\
                         f"1. Contract verification status"\
                         f"2. Presence of risky operations (delegatecall, selfdestruct)"\
                         f"3. Recent transaction patterns"

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a blockchain security expert analyzing smart contracts for potential scams."},
                {"role": "user", "content": analysis_prompt}
            ]
        )

        # Process OpenAI's analysis
        analysis = response.choices[0].message.content
        
        # Simple scoring based on keywords
        risk_score = 0.5  # Default moderate risk
        if 'verified' in analysis.lower():
            risk_score -= 0.2
        if 'delegatecall' in analysis.lower() or 'selfdestruct' in analysis.lower():
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