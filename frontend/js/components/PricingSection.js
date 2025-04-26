import { ethers } from 'ethers';

class PricingSection {
    constructor() {
        this.container = document.getElementById('pricing-section');
        this.subscriptionContract = null;
        this.stripeHandler = null;
        this.initializeStripe();
        this.initializeWeb3();
        this.render();
    }

    async initializeWeb3() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                this.provider = new ethers.providers.Web3Provider(window.ethereum);
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.userAccount = accounts[0];
                // Initialize subscription contract
                const contractAddress = process.env.SUBSCRIPTION_CONTRACT_ADDRESS;
                const contractABI = [/* Add contract ABI here */];
                this.subscriptionContract = new ethers.Contract(
                    contractAddress,
                    contractABI,
                    this.provider.getSigner()
                );
            } catch (error) {
                console.error('Web3 initialization error:', error);
            }
        }
    }

    initializeStripe() {
        this.stripeHandler = Stripe(process.env.STRIPE_PUBLIC_KEY);
    }

    async handleStripeSubscription(planId) {
        try {
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId })
            });
            const session = await response.json();
            await this.stripeHandler.redirectToCheckout({ sessionId: session.id });
        } catch (error) {
            console.error('Stripe subscription error:', error);
            alert('Failed to process payment. Please try again.');
        }
    }

    async handleCryptoSubscription(planId) {
        if (!this.subscriptionContract) {
            alert('Please connect your wallet first');
            return;
        }

        try {
            const price = planId === 'pro' ? ethers.utils.parseUnits('10', 6) : ethers.utils.parseUnits('25', 6);
            const tx = await this.subscriptionContract.subscribe(planId, {
                value: price
            });
            await tx.wait();
            alert('Subscription successful! Please wait for confirmation.');
        } catch (error) {
            console.error('Crypto subscription error:', error);
            alert('Failed to process subscription. Please try again.');
        }
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div class="sm:flex sm:flex-col sm:align-center mb-12">
                    <h1 class="text-5xl font-extrabold text-gray-900 sm:text-center">Pricing Plans</h1>
                    <p class="mt-5 text-xl text-gray-500 sm:text-center">Choose the perfect plan for your security needs</p>
                </div>
                <div class="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
                    <!-- Free Tier -->
                    <div class="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
                        <div class="p-6">
                            <h2 class="text-2xl font-semibold text-gray-900">Free</h2>
                            <p class="mt-4 text-sm text-gray-500">Perfect for getting started with smart contract security</p>
                            <p class="mt-8">
                                <span class="text-4xl font-extrabold text-gray-900">$0</span>
                                <span class="text-base font-medium text-gray-500">/mo</span>
                            </p>
                            <button onclick="pricingSection.handleFreeSignup()" 
                                class="mt-8 block w-full bg-indigo-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700">
                                Start Free
                            </button>
                        </div>
                        <div class="pt-6 pb-8 px-6">
                            <h3 class="text-xs font-medium text-gray-900 tracking-wide uppercase">What's included</h3>
                            <ul class="mt-6 space-y-4">
                                <li class="flex space-x-3">
                                    <svg class="flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    <span class="text-sm text-gray-500">3 smart contract scans/day</span>
                                </li>
                                <li class="flex space-x-3">
                                    <svg class="flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    <span class="text-sm text-gray-500">Basic verdict results</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Pro Tier -->
                    <div class="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 relative">
                        <div class="absolute top-0 right-0 -translate-y-1/2 px-4 py-1 bg-indigo-500 text-white text-sm font-semibold rounded-full">
                            Most Popular
                        </div>
                        <div class="p-6">
                            <h2 class="text-2xl font-semibold text-gray-900">Pro</h2>
                            <p class="mt-4 text-sm text-gray-500">Advanced security features for serious investors</p>
                            <p class="mt-8">
                                <span class="text-4xl font-extrabold text-gray-900">$10</span>
                                <span class="text-base font-medium text-gray-500">/mo</span>
                            </p>
                            <div class="mt-8 space-y-2">
                                <button onclick="pricingSection.handleStripeSubscription('pro')" 
                                    class="block w-full bg-indigo-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700">
                                    Subscribe with Stripe
                                </button>
                                <button onclick="pricingSection.handleCryptoSubscription('pro')" 
                                    class="block w-full bg-blue-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-blue-700">
                                    Subscribe with Crypto
                                </button>
                            </div>
                        </div>
                        <div class="pt-6 pb-8 px-6">
                            <h3 class="text-xs font-medium text-gray-900 tracking-wide uppercase">What's included</h3>
                            <ul class="mt-6 space-y-4">
                                <li class="flex space-x-3">
                                    <svg class="flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    <span class="text-sm text-gray-500">Unlimited smart contract scans</span>
                                </li>
                                <li class="flex space-x-3">
                                    <svg class="flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    <span class="text-sm text-gray-500">AI contract explanation</span>
                                </li>
                                <li class="flex space-x-3">
                                    <svg class="flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    <span class="text-sm text-gray-500">Detailed risk scores</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Elite Tier -->
                    <div class="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
                        <div class="p-6">
                            <h2 class="text-2xl font-semibold text-gray-900">Elite</h2>
                            <p class="mt-4 text-sm text-gray-500">Maximum security for professional traders</p>
                            <p class="mt-8">
                                <span class="text-4xl font-extrabold text-gray-900">$25</span>
                                <span class="text-base font-medium text-gray-500">/mo</span>
                            </p>
                            <div class="mt-8 space-y-2">
                                <button onclick="pricingSection.handleStripeSubscription('elite')" 
                                    class="block w-full bg-indigo-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700">
                                    Subscribe with Stripe
                                </button>
                                <button onclick="pricingSection.handleCryptoSubscription('elite')" 
                                    class="block w-full bg-blue-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-blue-700">
                                    Subscribe with Crypto
                                </button>
                            </div>
                        </div>
                        <div class="pt-6 pb-8 px-6">
                            <h3 class="text-xs font-medium text-gray-900 tracking-wide uppercase">What's included</h3>
                            <ul class="mt-6 space-y-4">
                                <li class="flex space-x-3">
                                    <svg class="flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    <span class="text-sm text-gray-500">Everything in Pro</span>
                                </li>
                                <li class="flex space-x-3">
                                    <svg class="flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    <span class="text-sm text-gray-500">Real-time scam alerts</span>
                                </li>
                                <li class="flex space-x-3">
                                    <svg class="flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    <span class="text-sm text-gray-500">Revoke tool access</span>
                                </li>
                                <li class="flex space-x-3">
                                    <svg class="flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    <span class="text-sm text-gray-500">Developer API access</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    handleFreeSignup() {
        window.location.href = '/register';
    }
}

// Initialize pricing section when the DOM is loaded
let pricingSection;
document.addEventListener('DOMContentLoaded', () => {
    pricingSection = new PricingSection();
});

export default PricingSection;