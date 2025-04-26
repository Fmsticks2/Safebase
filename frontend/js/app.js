import { ethers } from 'ethers';
import Chart from 'chart.js/auto';

class SafeBaseApp {
    constructor() {
        this.input = document.getElementById('input');
        this.checkBtn = document.getElementById('checkBtn');
        this.resultDiv = document.getElementById('result');
        this.verdict = document.getElementById('verdict');
        this.riskScore = document.getElementById('riskScore');
        this.explanation = document.getElementById('explanation');
        this.verdictContainer = document.getElementById('verdictContainer');
        this.watchlistContainer = document.getElementById('watchlist');
        this.chatContainer = document.getElementById('chat');
        
        // Initialize charts
        this.riskChart = null;
        this.activityChart = null;

        this.checkBtn.addEventListener('click', () => this.analyze());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.analyze();
        });

        // Initialize components
        this.initWeb3();
        this.initCharts();
        this.initChat();
        this.updateWatchlist();
    }

    async initWeb3() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                this.provider = new ethers.providers.Web3Provider(window.ethereum);
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.userAccount = accounts[0];
            } catch (error) {
                console.error('User denied account access');
            }
        } else {
            console.log('Please install MetaMask!');
        }
    }

    initCharts() {
        const riskCtx = document.getElementById('riskChart').getContext('2d');
        this.riskChart = new Chart(riskCtx, {
            type: 'doughnut',
            data: {
                labels: ['Safe', 'Medium Risk', 'High Risk'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#10B981', '#F59E0B', '#EF4444']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        const activityCtx = document.getElementById('activityChart').getContext('2d');
        this.activityChart = new Chart(activityCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Activity Score',
                    data: [],
                    borderColor: '#3B82F6',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    async analyze() {
        const input = this.input.value.trim();
        if (!input) {
            this.displayError(new Error('Please enter a smart contract address or URL'));
            return;
        }

        try {
            this.setLoading(true);
            
            const isAddress = ethers.utils.isAddress(input);
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ target: input }),
            });

            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.statusText}`);
            }

            const result = await response.json();
            this.displayResult(result);
            this.updateCharts(result);
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
        
        const verdictClass = this.getVerdictClass(result.verdict);
        this.resultDiv.innerHTML = `
            <div class="${verdictClass} p-4 rounded-md mb-4">
                <h3 class="font-bold text-lg mb-2">Verdict: ${result.verdict.toUpperCase()}</h3>
                <p class="mb-2">Risk Score: ${result.risk_score}/100</p>
                <p class="text-sm">${result.explanation}</p>
            </div>
            ${result.flags.length ? `
                <div class="mt-4">
                    <h4 class="font-bold mb-2">Risk Flags:</h4>
                    <ul class="list-disc pl-5">
                        ${result.flags.map(flag => `<li>${flag}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            <button onclick="app.addToWatchlist('${this.input.value}')" 
                class="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                Add to Watchlist
            </button>
        `;
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
                return 'bg-green-100 text-green-800';
            case 'risky':
                return 'bg-yellow-100 text-yellow-800';
            case 'scam':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    updateCharts(data) {
        // Update risk distribution chart
        const riskLevel = data.risk_score;
        const riskData = [0, 0, 0]; // [safe, medium, high]
        
        if (riskLevel < 30) riskData[0] = 1;
        else if (riskLevel < 70) riskData[1] = 1;
        else riskData[2] = 1;

        this.riskChart.data.datasets[0].data = riskData;
        this.riskChart.update();

        // Update activity chart
        const now = new Date().toLocaleTimeString();
        this.activityChart.data.labels.push(now);
        this.activityChart.data.datasets[0].data.push(data.risk_score);
        
        if (this.activityChart.data.labels.length > 10) {
            this.activityChart.data.labels.shift();
            this.activityChart.data.datasets[0].data.shift();
        }
        
        this.activityChart.update();
    }

    async addToWatchlist(address) {
        try {
            const response = await fetch('/api/monitor/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ address })
            });

            const data = await response.json();
            if (data.status === 'success') {
                this.updateWatchlist();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async updateWatchlist() {
        try {
            const response = await fetch('/api/monitor/list');
            const data = await response.json();

            this.watchlistContainer.innerHTML = Object.entries(data)
                .map(([address, info]) => `
                    <div class="bg-white p-4 rounded-lg shadow mb-4">
                        <p class="font-mono text-sm mb-2">${address}</p>
                        <p class="text-sm text-gray-600">Added: ${new Date(info.added_at).toLocaleDateString()}</p>
                        <p class="text-sm text-gray-600">Notifications: ${info.notifications ? 'Enabled' : 'Disabled'}</p>
                        ${info.alerts.length ? `
                            <div class="mt-2">
                                <h4 class="font-bold text-sm mb-1">Alerts:</h4>
                                <ul class="text-sm text-red-600">
                                    ${info.alerts.map(alert => `<li>${alert}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        <button onclick="app.removeFromWatchlist('${address}')" 
                            class="mt-2 text-red-600 text-sm hover:text-red-800">
                            Remove from Watchlist
                        </button>
                    </div>
                `).join('');
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async saveNotificationSettings() {
        const emailEnabled = document.getElementById('emailNotif').checked;
        const telegramEnabled = document.getElementById('telegramNotif').checked;
        const email = document.getElementById('emailInput').value;
        const telegramId = document.getElementById('telegramId').value;

        try {
            const response = await fetch('/api/monitor/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email_notifications: emailEnabled,
                    telegram_notifications: telegramEnabled,
                    email,
                    telegram_id: telegramId
                })
            });

            const data = await response.json();
            if (data.status === 'success') {
                alert('Notification settings saved successfully!');
                this.updateWatchlist();
            }
        } catch (error) {
            console.error('Error saving notification settings:', error);
            alert('Failed to save notification settings. Please try again.');
        }
    }

    async removeFromWatchlist(address) {
        try {
            const response = await fetch('/api/monitor/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ address })
            });

            const data = await response.json();
            if (data.status === 'success') {
                this.updateWatchlist();
            }
        } catch (error) {
            console.error('Error removing address from watchlist:', error);
        }
    }

    initChat() {
        const chatForm = document.getElementById('chatForm');
        const saveNotifBtn = document.getElementById('saveNotifSettings');
        saveNotifBtn.addEventListener('click', () => this.saveNotificationSettings());
        const chatInput = document.getElementById('chatInput');
        const chatHistory = document.getElementById('chatHistory');

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const question = chatInput.value.trim();
            if (!question) return;

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        question,
                        context: { lastAnalysis: this.resultDiv.innerHTML }
                    })
                });

                const data = await response.json();
                chatHistory.innerHTML += `
                    <div class="mb-4">
                        <p class="font-bold">You:</p>
                        <p class="ml-4">${question}</p>
                    </div>
                    <div class="mb-4 bg-blue-50 p-4 rounded">
                        <p class="font-bold">AI:</p>
                        <p class="ml-4">${data.answer}</p>
                    </div>
                `;
                chatInput.value = '';
                chatHistory.scrollTop = chatHistory.scrollHeight;
            } catch (error) {
                console.error('Error:', error);
            }
        });
    }
}

// Initialize the app when the DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SafeBaseApp();
});
