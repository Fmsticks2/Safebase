import { ethers } from 'ethers';

class SafeBaseApp {
    constructor() {
        this.input = document.getElementById('input');
        this.checkBtn = document.getElementById('checkBtn');
        this.resultDiv = document.getElementById('result');
        this.verdict = document.getElementById('verdict');
        this.riskScore = document.getElementById('riskScore');
        this.explanation = document.getElementById('explanation');
        this.verdictContainer = document.getElementById('verdictContainer');

        this.checkBtn.addEventListener('click', () => this.analyze());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.analyze();
        });

        // Initialize ethers provider
        if (window.ethereum) {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
        }
    }

    async analyze() {
        const input = this.input.value.trim();
        if (!input) {
            this.displayError(new Error('Please enter a smart contract address or URL'));
            return;
        }

        try {
            this.setLoading(true);
            
            // Determine if input is address or URL
            const isAddress = ethers.utils.isAddress(input);
            const endpoint = isAddress ? '/api/analyze/contract' : '/api/analyze/url';
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input }),
            });

            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.statusText}`);
            }

            const result = await response.json();
            this.displayResult(result);
        } catch (error) {
            this.displayError(error);
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(isLoading) {
        this.checkBtn.disabled = isLoading;
        this.checkBtn.textContent = isLoading ? 'Analyzing...' : 'Analyze';
    }

    displayResult(result) {
        this.resultDiv.classList.remove('hidden');
        
        // Set verdict and styling
        this.verdict.textContent = result.verdict;
        this.verdictContainer.className = `p-4 rounded-md ${this.getVerdictClass(result.verdict)}`;
        
        // Set risk score
        this.riskScore.textContent = `${result.risk_score.toFixed(2)}%`;
        
        // Set explanation
        this.explanation.textContent = result.explanation;
    }

    displayError(error) {
        this.resultDiv.classList.remove('hidden');
        this.verdict.textContent = 'Error';
        this.verdictContainer.className = 'p-4 rounded-md bg-red-100 text-red-700';
        this.riskScore.textContent = 'N/A';
        this.explanation.textContent = error.message || 'Failed to analyze the input. Please try again.';
    }

    getVerdictClass(verdict) {
        switch (verdict.toLowerCase()) {
            case 'safe':
                return 'bg-green-100 text-green-700';
            case 'suspicious':
                return 'bg-yellow-100 text-yellow-700';
            case 'likely scam':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SafeBaseApp();
});
