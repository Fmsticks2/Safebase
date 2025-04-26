from flask import Blueprint, request, jsonify
from ..subscription import subscription_service, require_subscription
import os

subscription_bp = Blueprint('subscription', __name__)

@subscription_bp.route('/subscribe', methods=['POST'])
def create_subscription():
    """Create a new subscription via Stripe checkout"""
    try:
        plan_id = request.json.get('planId')
        if not plan_id:
            return jsonify({'error': 'Plan ID is required'}), 400

        session = subscription_service.create_stripe_checkout_session(plan_id)
        if not session:
            return jsonify({'error': 'Failed to create checkout session'}), 500

        return jsonify({
            'sessionId': session.id,
            'publicKey': os.getenv('STRIPE_PUBLIC_KEY')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@subscription_bp.route('/check-subscription', methods=['GET'])
def check_subscription():
    """Check current user's subscription status"""
    try:
        user_address = request.args.get('address')
        if not user_address:
            return jsonify({'error': 'User address is required'}), 400

        status = subscription_service.check_subscription_status(user_address)
        if not status:
            return jsonify({'error': 'Failed to check subscription status'}), 500

        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@subscription_bp.route('/cancel-subscription', methods=['POST'])
@require_subscription(min_tier='pro')
def cancel_subscription():
    """Cancel an active subscription"""
    try:
        user_address = request.json.get('address')
        if not user_address:
            return jsonify({'error': 'User address is required'}), 400

        # For crypto subscriptions
        try:
            subscription_contract.functions.cancelSubscription().transact({
                'from': user_address
            })
        except Exception as e:
            print(f"Error cancelling crypto subscription: {e}")

        # For Stripe subscriptions
        stripe_customer_id = request.json.get('stripeCustomerId')
        if stripe_customer_id:
            try:
                subscriptions = stripe.Subscription.list(customer=stripe_customer_id)
                if subscriptions.data:
                    stripe.Subscription.delete(subscriptions.data[0].id)
            except Exception as e:
                print(f"Error cancelling Stripe subscription: {e}")

        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Webhook endpoint for Stripe events
@subscription_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events"""
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
        )
    except ValueError as e:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        return jsonify({'error': 'Invalid signature'}), 400

    if event.type == 'customer.subscription.deleted':
        # Handle subscription cancellation
        subscription = event.data.object
        print(f"Subscription cancelled for customer: {subscription.customer}")

    elif event.type == 'customer.subscription.updated':
        # Handle subscription updates
        subscription = event.data.object
        print(f"Subscription updated for customer: {subscription.customer}")

    return jsonify({'status': 'success'})