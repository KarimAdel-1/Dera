// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ConfiguratorInputTypes library
 * @author DERA Protocol
 * @notice Input structures for PoolConfigurator admin functions on Hedera
 * @dev Used by pool admin to initialize and update reserves
 * 
 * HEDERA TOOLS USED:
 * - Hedera SDK: Admin uses SDK to call configurator functions
 * - HCS (Hedera Consensus Service): Configuration changes logged to HCS
 * - Mirror Nodes: Configuration history queryable via REST API
 * 
 * STRUCTURES:
 * - InitAssetInput: Initialize new lending market for an asset
 *   - dTokenImpl: DToken implementation address (interest-bearing deposit token)
 *   - variableDebtTokenImpl: Debt token implementation address
 *   - underlyingAsset: HTS token address to be listed
 *   - Token names/symbols: Display names for dToken and debt token
 *   - params: Initialization parameters (decimals, etc.)
 *   - interestRateData: Interest rate strategy parameters
 * 
 * - UpdateDTokenInput: Update dToken implementation (upgrades)
 * - UpdateDebtTokenInput: Update debt token implementation (upgrades)
 * 
 * ACCESS CONTROL:
 * - Only pool admin can call these functions
 * - Managed via ACLManager (Hedera account keys)
 * 
 * USE CASES:
 * - List new HTS token for lending/borrowing
 * - Upgrade token implementations (bug fixes, new features)
 * - Update token metadata (name, symbol)
 */
library ConfiguratorInputTypes {
  struct InitAssetInput {
    address dTokenImpl;
    address variableDebtTokenImpl;
    address underlyingAsset;
    string dTokenName;
    string dTokenSymbol;
    string variableDebtTokenName;
    string variableDebtTokenSymbol;
    bytes params;
    bytes interestRateData;
  }

  struct UpdateDTokenInput {
    address asset;
    string name;
    string symbol;
    address implementation;
    bytes params;
  }

  struct UpdateDebtTokenInput {
    address asset;
    string name;
    string symbol;
    address implementation;
    bytes params;
  }
}
