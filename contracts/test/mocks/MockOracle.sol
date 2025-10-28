// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../interfaces/IPriceOracleGetter.sol";

/**
 * @title MockOracle
 * @notice Mock price oracle for testing
 */
contract MockOracle is IPriceOracleGetter {
    mapping(address => uint256) private prices;

    function setAssetPrice(address asset, uint256 price) external {
        prices[asset] = price;
    }

    function getAssetPrice(address asset) external view override returns (uint256) {
        uint256 price = prices[asset];
        require(price != 0, "Price not set");
        return price;
    }

    function BASE_CURRENCY() external pure returns (address) {
        return address(0);
    }

    function BASE_CURRENCY_UNIT() external pure returns (uint256) {
        return 1e8; // 8 decimals
    }
}
