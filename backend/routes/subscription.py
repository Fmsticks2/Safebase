from flask import Blueprint, request, jsonify
from ..subscription import subscription_service, require_subscription, subscription_contract
import os

subscription_bp = Blueprint('subscription', __name__)

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

        try:
            subscription_contract.functions.cancelSubscription().transact({
                'from': user_address
            })
            return jsonify({'status': 'success'})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500