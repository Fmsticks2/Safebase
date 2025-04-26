from functools import wraps
from datetime import datetime, timedelta
from flask import request, jsonify
import jwt
from web3 import Web3
from eth_account import Account
import stripe
import os
from collections import defaultdict

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(os.getenv('BASE_RPC_URL')))
subscription_contract = w3.eth.contract(
    address=os.getenv('SUBSCRIPTION_CONTRACT_ADDRESS'),
    abi=os.getenv('SUBSCRIPTION_CONTRACT_ABI')
)

class SubscriptionService:
    def __init__(self):
        self.free_tier_limits = defaultdict(lambda: {'count': 0, 'reset_time': None})
        self.rate_limit_duration = timedelta(days=1)
        self.free_tier_daily_limit = 3

    def check_subscription_status(self, user_address):
        """Check subscription status from the smart contract"""
        try:
            is_valid, tier, expiry = subscription_contract.functions.hasValidSubscription(user_address).call()
            return {
                'is_valid': is_valid,
                'tier': tier,
                'expiry': expiry
            }
        except Exception as e:
            print(f"Error checking subscription: {e}")
            return None

    def validate_stripe_subscription(self, user_id):
        """Validate Stripe subscription status"""
        try:
            subscriptions = stripe.Subscription.list(customer=user_id)
            return len(subscriptions.data) > 0 and subscriptions.data[0].status == 'active'
        except Exception as e:
            print(f"Error validating Stripe subscription: {e}")
            return False

    def check_free_tier_limit(self, user_address):
        """Check if free tier user has exceeded daily limit"""
        user_limit = self.free_tier_limits[user_address]
        now = datetime.now()

        # Reset counter if it's a new day
        if not user_limit['reset_time'] or now - user_limit['reset_time'] >= self.rate_limit_duration:
            user_limit['count'] = 0
            user_limit['reset_time'] = now

        # Check if user has exceeded limit
        if user_limit['count'] >= self.free_tier_daily_limit:
            return False

        user_limit['count'] += 1
        return True

    def create_stripe_checkout_session(self, plan_id):
        """Create Stripe checkout session for subscription"""
        try:
            price_id = os.getenv(f'STRIPE_PRICE_ID_{plan_id.upper()}')
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=os.getenv('STRIPE_SUCCESS_URL'),
                cancel_url=os.getenv('STRIPE_CANCEL_URL'),
            )
            return session
        except Exception as e:
            print(f"Error creating checkout session: {e}")
            return None

# Initialize subscription service
subscription_service = SubscriptionService()

def require_subscription(min_tier='free'):
    """Decorator to validate subscription status"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get user address from auth header
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                return jsonify({'error': 'No authorization header'}), 401

            try:
                # Verify JWT and get user address
                token = auth_header.split(' ')[1]
                payload = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
                user_address = payload['address']

                # For free tier, check rate limit
                if min_tier == 'free':
                    if not subscription_service.check_free_tier_limit(user_address):
                        return jsonify({
                            'error': 'Free tier daily limit exceeded',
                            'upgrade_url': '/pricing'
                        }), 429
                    return f(*args, **kwargs)

                # Check crypto subscription
                crypto_sub = subscription_service.check_subscription_status(user_address)
                if crypto_sub and crypto_sub['is_valid']:
                    if min_tier == 'pro' and crypto_sub['tier'] in ['pro', 'elite']:
                        return f(*args, **kwargs)
                    if min_tier == 'elite' and crypto_sub['tier'] == 'elite':
                        return f(*args, **kwargs)

                # Check Stripe subscription
                stripe_sub = subscription_service.validate_stripe_subscription(payload.get('stripe_customer_id'))
                if stripe_sub:
                    return f(*args, **kwargs)

                return jsonify({
                    'error': f'This endpoint requires {min_tier} subscription',
                    'upgrade_url': '/pricing'
                }), 403

            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid token'}), 401
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        return decorated_function
    return decorator