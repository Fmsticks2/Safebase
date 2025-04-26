// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SafeBaseSubscription {
    enum SubscriptionTier { Free, Pro, Elite }

    struct Subscription {
        bool isValid;
        SubscriptionTier tier;
        uint256 expiryTime;
    }

    mapping(address => Subscription) public subscriptions;
    address public owner;
    mapping(SubscriptionTier => uint256) public tierPrices;
    mapping(SubscriptionTier => uint256) public tierDurations;

    event SubscriptionPurchased(address indexed user, SubscriptionTier tier, uint256 expiryTime);
    event SubscriptionCancelled(address indexed user);
    event TierPriceUpdated(SubscriptionTier tier, uint256 price);
    event TierDurationUpdated(SubscriptionTier tier, uint256 duration);

    constructor() {
        owner = msg.sender;
        
        // Set initial prices (in wei)
        tierPrices[SubscriptionTier.Pro] = 0.01 ether;
        tierPrices[SubscriptionTier.Elite] = 0.05 ether;

        // Set subscription durations (in seconds)
        tierDurations[SubscriptionTier.Pro] = 30 days;
        tierDurations[SubscriptionTier.Elite] = 30 days;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function subscribe(SubscriptionTier tier) external payable {
        require(tier != SubscriptionTier.Free, "Cannot purchase free tier");
        require(msg.value == tierPrices[tier], "Incorrect payment amount");

        uint256 duration = tierDurations[tier];
        uint256 expiryTime = block.timestamp + duration;

        subscriptions[msg.sender] = Subscription({
            isValid: true,
            tier: tier,
            expiryTime: expiryTime
        });

        emit SubscriptionPurchased(msg.sender, tier, expiryTime);
    }

    function cancelSubscription() external {
        require(subscriptions[msg.sender].isValid, "No active subscription");
        delete subscriptions[msg.sender];
        emit SubscriptionCancelled(msg.sender);
    }

    function hasValidSubscription(address user) external view returns (bool isValid, SubscriptionTier tier, uint256 expiry) {
        Subscription memory sub = subscriptions[user];
        if (sub.isValid && sub.expiryTime > block.timestamp) {
            return (true, sub.tier, sub.expiryTime);
        }
        return (false, SubscriptionTier.Free, 0);
    }

    function updateTierPrice(SubscriptionTier tier, uint256 newPrice) external onlyOwner {
        require(tier != SubscriptionTier.Free, "Cannot set price for free tier");
        tierPrices[tier] = newPrice;
        emit TierPriceUpdated(tier, newPrice);
    }

    function updateTierDuration(SubscriptionTier tier, uint256 newDuration) external onlyOwner {
        require(tier != SubscriptionTier.Free, "Cannot set duration for free tier");
        tierDurations[tier] = newDuration;
        emit TierDurationUpdated(tier, newDuration);
    }

    function withdrawFunds() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
}