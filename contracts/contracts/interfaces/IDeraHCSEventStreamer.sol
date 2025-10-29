// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDeraHCSEventStreamer
 * @notice Interface for HCS Event Streamer contract
 */
interface IDeraHCSEventStreamer {
    function queueSupplyEvent(
        address user,
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function queueWithdrawEvent(
        address user,
        address asset,
        uint256 amount,
        address to
    ) external;

    function queueBorrowEvent(
        address user,
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function queueRepayEvent(
        address user,
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external;

    function queueLiquidationEvent(
        address liquidator,
        address borrower,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover,
        uint256 liquidatedCollateral,
        bool receiveSupplyToken
    ) external;
}
