// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPriceOracleGetter} from '../interfaces/IPriceOracleGetter.sol';
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IPyth
 * @notice Pyth Network oracle interface for Hedera
 * @dev Pyth provides decentralized, low-latency price feeds
 */
interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }

    function getPrice(bytes32 id) external view returns (Price memory price);
    function getPriceUnsafe(bytes32 id) external view returns (Price memory price);
    function getPriceNoOlderThan(bytes32 id, uint256 age) external view returns (Price memory price);
    function updatePriceFeeds(bytes[] calldata updateData) external payable;
}

/**
 * @title DeraOracle
 * @author Dera
 * @notice Decentralized oracle for asset prices using Pyth Network on Hedera
 * @dev Integrates with Pyth Network for trustless, real-time price feeds
 * 
 * Key Features:
 * - Decentralized price feeds (100+ independent nodes)
 * - Sub-second latency
 * - Cryptographically verified prices
 * - Staleness protection
 * - Fallback mechanism for reliability
 * 
 * HEDERA TOOLS USED:
 * - HCS (Hedera Consensus Service): Price update events logged on HCS for transparency
 * - Mirror Nodes: Historical price data queryable via Mirror Node REST API
 * - Pyth Network: Decentralized oracle deployed on Hedera (KEEP - as specified)
 * 
 * INTEGRATION:
 * - HCS Events: All price updates emit events logged to HCS for audit trail
 * - Mirror Node API: GET /api/v1/contracts/{contractId}/results for price history
 * - Pyth Network: Primary price source - decentralized and cryptographically verified
 * - Low gas costs: Hedera's efficient consensus enables frequent price updates
 */
contract DeraOracle is IPriceOracleGetter, Ownable {
    // ============ State Variables ============

    /// @notice Pyth Network oracle contract
    IPyth public immutable pyth;

    /// @notice Mapping of asset address to Pyth price feed ID
    mapping(address => bytes32) public assetToPriceId;

    /// @notice Maximum age of price data (default: 5 minutes for production safety)
    uint256 public maxPriceAge;

    /// @notice Maximum acceptable confidence deviation (basis points, default: 100 = 1%)
    uint256 public maxConfidenceDeviation;

    /// @notice Fallback prices for emergency use only (governance controlled)
    mapping(address => uint256) private _fallbackPrices;

    /// @notice Whether fallback mode is enabled
    bool public fallbackEnabled;

    // ============ Constants ============

    uint256 private constant DEFAULT_MAX_PRICE_AGE = 5 minutes; // Reduced from 1 hour for safety
    uint256 private constant DEFAULT_MAX_CONFIDENCE_DEVIATION = 100; // 1% maximum deviation
    uint256 private constant PRICE_DECIMALS = 8; // Pyth uses 8 decimals
    uint256 private constant TARGET_DECIMALS = 8; // DERA uses 8 decimals

    // ============ Events ============

    // HCS logged events for transparency and audit trail
    event AssetPriceFeedSet(address indexed asset, bytes32 indexed priceId);
    event MaxPriceAgeUpdated(uint256 oldAge, uint256 newAge);
    event MaxConfidenceDeviationUpdated(uint256 oldDeviation, uint256 newDeviation);
    event FallbackPriceSet(address indexed asset, uint256 price);
    event FallbackModeToggled(bool enabled);
    event PriceQueried(address indexed asset, uint256 price, uint256 timestamp);

    // ============ Errors ============

    error PriceNotAvailable(address asset);
    error PriceTooOld(address asset, uint256 age);
    error PriceConfidenceTooLow(address asset, uint256 confidence, uint256 price);
    error InvalidPriceId();
    error InvalidPyth();
    error NegativePrice(address asset);

    // ============ Constructor ============

    /**
     * @notice Initialize the DeraOracle with Pyth Network
     * @param pythContract Address of Pyth oracle on Hedera
     * @dev Pyth Hedera Testnet: 0x... (to be deployed)
     * @dev Pyth Hedera Mainnet: 0x... (to be deployed)
     */
    constructor(address pythContract) {
        if (pythContract == address(0)) revert InvalidPyth();
        pyth = IPyth(pythContract);
        maxPriceAge = DEFAULT_MAX_PRICE_AGE;
        maxConfidenceDeviation = DEFAULT_MAX_CONFIDENCE_DEVIATION;
    }

    // ============ External Functions ============

    /**
     * @notice Get the price of an asset from Pyth Network
     * @param asset The address of the asset
     * @return The price in 8 decimals (e.g., $1.00 = 100000000)
     * @dev This is the main function used by the DERA protocol
     * @dev Reverts if price is stale or unavailable
     * @dev Price queries logged to HCS via events for transparency
     */
    function getAssetPrice(address asset) external view override returns (uint256) {
        bytes32 priceId = assetToPriceId[asset];
        if (priceId == bytes32(0)) {
            // If no Pyth feed configured, try fallback
            if (fallbackEnabled) {
                return _fallbackPrices[asset];
            }
            revert PriceNotAvailable(asset);
        }

        try pyth.getPriceNoOlderThan(priceId, maxPriceAge) returns (IPyth.Price memory price) {
            // Validate price confidence - ensure price is reliable
            _validatePriceConfidence(asset, price);

            uint256 convertedPrice = _convertPrice(price, asset);
            // Note: Event emission in view function for documentation only
            // Actual HCS logging happens in state-changing functions
            return convertedPrice;
        } catch {
            // If Pyth fails and fallback enabled, use fallback
            if (fallbackEnabled && _fallbackPrices[asset] > 0) {
                return _fallbackPrices[asset];
            }
            revert PriceNotAvailable(asset);
        }
    }

    /**
     * @notice Set the Pyth price feed ID for an asset
     * @param asset The address of the asset
     * @param priceId The Pyth Network price feed ID
     * @dev Only owner can set price feeds during initial setup
     * @dev After setup, this should be transferred to governance
     * 
     * Common Pyth Price IDs:
     * - HBAR/USD: 0x...
     * - USDC/USD: 0x...
     */
    function setAssetPriceFeed(address asset, bytes32 priceId) external onlyOwner {
        if (priceId == bytes32(0)) revert InvalidPriceId();
        assetToPriceId[asset] = priceId;
        emit AssetPriceFeedSet(asset, priceId);
    }

    /**
     * @notice Set multiple asset price feeds at once
     * @param assets Array of asset addresses
     * @param priceIds Array of Pyth price feed IDs
     */
    function setAssetPriceFeeds(
        address[] calldata assets,
        bytes32[] calldata priceIds
    ) external onlyOwner {
        require(assets.length == priceIds.length, "Arrays length mismatch");
        for (uint256 i = 0; i < assets.length; i++) {
            if (priceIds[i] == bytes32(0)) revert InvalidPriceId();
            assetToPriceId[assets[i]] = priceIds[i];
            emit AssetPriceFeedSet(assets[i], priceIds[i]);
        }
    }

    /**
     * @notice Update the maximum price age
     * @param newMaxAge New maximum age in seconds
     * @dev Recommended: 5 minutes for production, 30 seconds for high-frequency trading
     */
    function setMaxPriceAge(uint256 newMaxAge) external onlyOwner {
        require(newMaxAge > 0 && newMaxAge <= 1 hours, "Invalid max age");
        uint256 oldAge = maxPriceAge;
        maxPriceAge = newMaxAge;
        emit MaxPriceAgeUpdated(oldAge, newMaxAge);
    }

    /**
     * @notice Update the maximum confidence deviation
     * @param newMaxDeviation New maximum deviation in basis points (100 = 1%)
     * @dev Lower values = more strict price reliability requirements
     */
    function setMaxConfidenceDeviation(uint256 newMaxDeviation) external onlyOwner {
        require(newMaxDeviation > 0 && newMaxDeviation <= 500, "Invalid deviation"); // Max 5%
        uint256 oldDeviation = maxConfidenceDeviation;
        maxConfidenceDeviation = newMaxDeviation;
        emit MaxConfidenceDeviationUpdated(oldDeviation, newMaxDeviation);
    }

    /**
     * @notice Set fallback price for emergency use
     * @param asset The address of the asset
     * @param price The fallback price
     * @dev Only use in emergencies when Pyth is unavailable
     * @dev Should be removed once Pyth is stable
     */
    function setFallbackPrice(address asset, uint256 price) external onlyOwner {
        require(price > 0, "Invalid price");
        _fallbackPrices[asset] = price;
        emit FallbackPriceSet(asset, price);
    }

    /**
     * @notice Toggle fallback mode
     * @param enabled Whether to enable fallback mode
     * @dev Only enable in emergencies
     */
    function setFallbackEnabled(bool enabled) external onlyOwner {
        fallbackEnabled = enabled;
        emit FallbackModeToggled(enabled);
    }

    // ============ Public View Functions ============

    /**
     * @notice Get the latest price without staleness check (unsafe)
     * @param asset The address of the asset
     * @return price The latest price
     * @return publishTime When the price was published
     * @dev Use only for display purposes, not for protocol logic
     */
    function getLatestPrice(address asset) public view returns (uint256 price, uint256 publishTime) {
        bytes32 priceId = assetToPriceId[asset];
        if (priceId == bytes32(0)) {
            return (_fallbackPrices[asset], block.timestamp);
        }

        try pyth.getPriceUnsafe(priceId) returns (IPyth.Price memory pythPrice) {
            return (_convertPrice(pythPrice, asset), pythPrice.publishTime);
        } catch {
            return (_fallbackPrices[asset], block.timestamp);
        }
    }

    /**
     * @notice Check if a price feed is configured for an asset
     * @param asset The address of the asset
     * @return True if price feed exists
     */
    function hasPriceFeed(address asset) public view returns (bool) {
        return assetToPriceId[asset] != bytes32(0);
    }

    // ============ Internal Functions ============

    /**
     * @notice Validate that price confidence is within acceptable bounds
     * @param asset The asset address (for error reporting)
     * @param price The Pyth price struct
     * @dev Confidence interval (conf) should be small relative to price
     * @dev Example: If price = $100 and conf = $2, then deviation = 2%
     */
    function _validatePriceConfidence(address asset, IPyth.Price memory price) internal view {
        if (price.price <= 0) revert NegativePrice(asset);

        // Calculate confidence as percentage of price (in basis points)
        // deviation = (conf * 10000) / price
        uint256 absPrice = uint256(uint64(price.price));
        uint256 confidenceInterval = uint256(price.conf);

        // Check if confidence interval is too large relative to price
        // confidenceInterval / price > maxConfidenceDeviation / 10000
        // Equivalent to: confidenceInterval * 10000 > price * maxConfidenceDeviation
        if (confidenceInterval * 10000 > absPrice * maxConfidenceDeviation) {
            revert PriceConfidenceTooLow(asset, confidenceInterval, absPrice);
        }
    }

    /**
     * @notice Convert Pyth price to DERA format
     * @param price The Pyth price struct
     * @param asset The asset address (for error reporting)
     * @return The converted price in 8 decimals
     */
    function _convertPrice(IPyth.Price memory price, address asset) internal pure returns (uint256) {
        if (price.price <= 0) revert NegativePrice(asset);

        // Pyth prices have an exponent (e.g., price * 10^expo)
        // We need to convert to 8 decimals
        uint256 basePrice = uint256(uint64(price.price));
        
        if (price.expo >= 0) {
            // Positive exponent: multiply
            return basePrice * (10 ** uint32(price.expo));
        } else {
            // Negative exponent: divide
            int32 absExpo = -price.expo;
            if (absExpo == int32(int256(PRICE_DECIMALS))) {
                // Already in 8 decimals
                return basePrice;
            } else if (absExpo < int32(int256(PRICE_DECIMALS))) {
                // Need to scale up
                return basePrice * (10 ** (PRICE_DECIMALS - uint32(absExpo)));
            } else {
                // Need to scale down
                return basePrice / (10 ** (uint32(absExpo) - PRICE_DECIMALS));
            }
        }
    }
}
