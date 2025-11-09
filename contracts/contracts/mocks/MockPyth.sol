// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockPyth
 * @notice Minimal mock Pyth contract to satisfy oracle's immutable pyth reference
 * @dev This contract doesn't need to work - it just needs to exist at the address
 *      the oracle was deployed with. Since assetToPriceId is zero for all assets,
 *      the oracle will use fallback prices and never actually call this contract.
 */
contract MockPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }

    /**
     * @notice Returns a dummy price (this should never be called since we use fallback)
     * @dev Reverts to ensure we're not accidentally using this instead of fallback
     */
    function getPriceNoOlderThan(bytes32, uint256) external pure returns (Price memory) {
        revert("MockPyth: Use fallback prices instead");
    }

    function getPrice(bytes32) external pure returns (Price memory) {
        revert("MockPyth: Use fallback prices instead");
    }

    function getPriceUnsafe(bytes32) external pure returns (Price memory) {
        revert("MockPyth: Use fallback prices instead");
    }

    function updatePriceFeeds(bytes[] calldata) external payable {
        revert("MockPyth: Use fallback prices instead");
    }
}
