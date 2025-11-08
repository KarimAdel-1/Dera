// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
pragma experimental ABIEncoderV2;

import {IPool} from "../interfaces/IPool.sol";
import {PoolAddressesProvider} from "../protocol/configuration/PoolAddressesProvider.sol";
import {DeraPoolConfigurator} from "../protocol/pool/DeraPoolConfigurator.sol";
import {ConcreteDeraSupplyToken} from "../protocol/tokenization/ConcreteDeraSupplyToken.sol";
import {DefaultReserveInterestRateStrategy} from "../misc/DefaultReserveInterestRateStrategy.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeraTokensAndRatesHelper
 * @notice Helper contract for batch deployment and configuration of tokens and rate strategies
 * @dev Based on Bonzo's ATokensAndRatesHelper pattern but adapted for Dera Protocol
 */
contract DeraTokensAndRatesHelper is Ownable {
    address payable private pool;
    address private addressesProvider;
    address private poolConfigurator;
    
    event DeployedContracts(address supplyToken, address strategy);

    struct InitDeploymentInput {
        address asset;
        uint256[6] rates; // [optimalUtilization, baseRate, slope1, slope2, stableSlope1, stableSlope2]
    }

    struct ConfigureReserveInput {
        address asset;
        uint256 baseLTV;
        uint256 liquidationThreshold;
        uint256 liquidationBonus;
        uint256 reserveFactor;
        bool stableBorrowingEnabled;
        bool borrowingEnabled;
    }

    constructor(
        address payable _pool,
        address _addressesProvider,
        address _poolConfigurator
    ) {
        pool = _pool;
        addressesProvider = _addressesProvider;
        poolConfigurator = _poolConfigurator;
    }

    /**
     * @notice Deploy supply tokens and rate strategies in batch
     * @param inputParams Array of deployment parameters
     */
    function initDeployment(InitDeploymentInput[] calldata inputParams) external onlyOwner {
        for (uint256 i = 0; i < inputParams.length; i++) {
            // Deploy supply token implementation
            ConcreteDeraSupplyToken supplyToken = new ConcreteDeraSupplyToken(
                IPool(pool),
                msg.sender
            );

            // Deploy rate strategy
            DefaultReserveInterestRateStrategy strategy = new DefaultReserveInterestRateStrategy(
                inputParams[i].rates[0], // optimalUtilizationRate
                inputParams[i].rates[1], // baseVariableBorrowRate
                inputParams[i].rates[2], // variableRateSlope1
                inputParams[i].rates[3]  // variableRateSlope2
            );

            emit DeployedContracts(address(supplyToken), address(strategy));
        }
    }

    /**
     * @notice Configure reserves in batch following Bonzo's pattern
     * @param inputParams Array of configuration parameters
     */
    function configureReserves(ConfigureReserveInput[] calldata inputParams) external onlyOwner {
        DeraPoolConfigurator configurator = DeraPoolConfigurator(poolConfigurator);
        
        for (uint256 i = 0; i < inputParams.length; i++) {
            // Configure collateral parameters
            configurator.configureAssetAsCollateral(
                inputParams[i].asset,
                inputParams[i].baseLTV,
                inputParams[i].liquidationThreshold,
                inputParams[i].liquidationBonus
            );

            // Enable borrowing if specified
            if (inputParams[i].borrowingEnabled) {
                configurator.setAssetBorrowing(
                    inputParams[i].asset,
                    inputParams[i].borrowingEnabled
                );
            }

            // Set reserve factor
            configurator.setAssetFactor(inputParams[i].asset, inputParams[i].reserveFactor);
        }
    }

    /**
     * @notice Get the pool address
     */
    function getPool() external view returns (address) {
        return pool;
    }

    /**
     * @notice Get the addresses provider
     */
    function getAddressesProvider() external view returns (address) {
        return addressesProvider;
    }

    /**
     * @notice Get the pool configurator
     */
    function getPoolConfigurator() external view returns (address) {
        return poolConfigurator;
    }
}