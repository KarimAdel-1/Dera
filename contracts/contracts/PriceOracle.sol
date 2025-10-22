// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @dev Provides reliable HBAR/USD price feed for the Dera platform
 * @notice Price updates are provided by authorized backend service
 * Features:
 * - Authorized price provider only
 * - Circuit breaker for extreme price changes (>20%)
 * - Price staleness detection (15 minutes)
 * - 8 decimal precision
 */
contract PriceOracle is Ownable {
    // Price scaled to 8 decimals (e.g., $0.05 = 5000000)
    uint256 public currentPrice;
    uint256 public lastUpdateTimestamp;
    address public priceProvider;

    // Circuit breaker: reject price changes > 20%
    uint256 public constant MAX_PRICE_CHANGE_PERCENT = 20;
    // Price is stale if not updated in 15 minutes
    uint256 public constant STALENESS_THRESHOLD = 15 minutes;
    // Decimal precision for price (8 decimals)
    uint256 public constant PRICE_DECIMALS = 8;
    uint256 public constant PRICE_PRECISION = 10 ** PRICE_DECIMALS;

    event PriceUpdated(uint256 newPrice, uint256 timestamp);
    event PriceProviderSet(address indexed provider);

    /**
     * @dev Constructor initializes with initial price and price provider
     * @param _initialPrice Initial HBAR/USD price (scaled to 8 decimals)
     * @param _priceProvider Address authorized to update prices
     */
    constructor(uint256 _initialPrice, address _priceProvider) Ownable(msg.sender) {
        require(_initialPrice > 0, "Initial price must be positive");
        require(_priceProvider != address(0), "Invalid price provider");

        currentPrice = _initialPrice;
        lastUpdateTimestamp = block.timestamp;
        priceProvider = _priceProvider;

        emit PriceUpdated(_initialPrice, block.timestamp);
        emit PriceProviderSet(_priceProvider);
    }

    /**
     * @dev Sets a new price provider address
     * @param _priceProvider New price provider address
     */
    function setPriceProvider(address _priceProvider) external onlyOwner {
        require(_priceProvider != address(0), "Invalid price provider");
        priceProvider = _priceProvider;
        emit PriceProviderSet(_priceProvider);
    }

    /**
     * @dev Updates the HBAR/USD price
     * @param _newPrice New price (scaled to 8 decimals)
     * @notice Only callable by authorized price provider
     * @notice Implements circuit breaker for extreme price changes
     */
    function updatePrice(uint256 _newPrice) external {
        require(msg.sender == priceProvider, "Only price provider can update");
        require(_newPrice > 0, "Price must be positive");

        // Circuit breaker: check if price change is within acceptable range
        if (currentPrice > 0) {
            uint256 priceChange;
            if (_newPrice > currentPrice) {
                priceChange = ((_newPrice - currentPrice) * 100) / currentPrice;
            } else {
                priceChange = ((currentPrice - _newPrice) * 100) / currentPrice;
            }

            require(
                priceChange <= MAX_PRICE_CHANGE_PERCENT,
                "Price change exceeds circuit breaker threshold"
            );
        }

        currentPrice = _newPrice;
        lastUpdateTimestamp = block.timestamp;

        emit PriceUpdated(_newPrice, block.timestamp);
    }

    /**
     * @dev Gets the current HBAR/USD price
     * @return price Current price (scaled to 8 decimals)
     * @notice Reverts if price is stale
     */
    function getPrice() external view returns (uint256) {
        require(!isStale(), "Price is stale");
        return currentPrice;
    }

    /**
     * @dev Gets the current price with timestamp
     * @return price Current price
     * @return timestamp Last update timestamp
     */
    function getPriceWithTimestamp() external view returns (uint256 price, uint256 timestamp) {
        require(!isStale(), "Price is stale");
        return (currentPrice, lastUpdateTimestamp);
    }

    /**
     * @dev Checks if the price is stale (not updated in 15 minutes)
     * @return bool True if price is stale, false otherwise
     */
    function isStale() public view returns (bool) {
        return block.timestamp - lastUpdateTimestamp > STALENESS_THRESHOLD;
    }

    /**
     * @dev Gets the age of the current price
     * @return uint256 Seconds since last update
     */
    function getPriceAge() external view returns (uint256) {
        return block.timestamp - lastUpdateTimestamp;
    }

    /**
     * @dev Converts HBAR amount to USD value
     * @param hbarAmount Amount of HBAR (in tinybars, 8 decimals)
     * @return usdValue Equivalent USD value (8 decimals)
     */
    function hbarToUsd(uint256 hbarAmount) external view returns (uint256) {
        require(!isStale(), "Price is stale");
        return (hbarAmount * currentPrice) / PRICE_PRECISION;
    }

    /**
     * @dev Converts USD amount to HBAR value
     * @param usdAmount Amount in USD (8 decimals)
     * @return hbarValue Equivalent HBAR value (in tinybars, 8 decimals)
     */
    function usdToHbar(uint256 usdAmount) external view returns (uint256) {
        require(!isStale(), "Price is stale");
        require(currentPrice > 0, "Invalid price");
        return (usdAmount * PRICE_PRECISION) / currentPrice;
    }
}
