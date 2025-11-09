// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPriceOracleGetter {
    function getAssetPrice(address asset) external view returns (uint256);
}

/**
 * @title TestOracleCall
 * @notice Simple contract to test calling oracle from within a transaction
 */
contract TestOracleCall {
    IPriceOracleGetter public oracle;
    uint256 public lastPrice;

    constructor(address _oracle) {
        oracle = IPriceOracleGetter(_oracle);
    }

    function testGetPrice(address asset) external returns (uint256) {
        // Call oracle.getAssetPrice() from within a transaction
        uint256 price = oracle.getAssetPrice(asset);
        lastPrice = price;
        return price;
    }
}
