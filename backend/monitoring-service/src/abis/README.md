# Contract ABIs

This directory contains the ABI files needed for the Monitoring Service.

## Required Files

After compiling the contracts, copy these ABIs here:

```bash
# From the contracts directory
cp artifacts/contracts/protocol/pool/Pool.sol/Pool.json backend/monitoring-service/src/abis/
cp artifacts/contracts/protocol/pool/PoolConfigurator.sol/PoolConfigurator.json backend/monitoring-service/src/abis/
cp artifacts/contracts/misc/DeraOracle.sol/DeraOracle.json backend/monitoring-service/src/abis/
cp artifacts/contracts/hedera/DeraNodeStaking.sol/DeraNodeStaking.json backend/monitoring-service/src/abis/
```

## Files

- `Pool.json` - Main pool contract for pause status and metrics
- `PoolConfigurator.json` - Configurator for emergency controls
- `DeraOracle.json` - Price oracle for price feed monitoring
- `DeraNodeStaking.json` - Staking contract for staking metrics

## Functions Used

The service calls these contract functions:

```solidity
// Pool
function paused() external view returns (bool);
function getAssetsList() external view returns (address[] memory);
function getAssetData(address asset) external view returns (...);
function pause() external;  // Emergency Admin only

// Oracle
function getAssetPrice(address asset) external view returns (uint256);

// Staking
function getStakingInfo() external view returns (...);
```
