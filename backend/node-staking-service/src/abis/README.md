# Contract ABIs

This directory contains the ABI file needed for the Node Staking Service.

## Required File

After compiling the contracts, copy this ABI here:

```bash
# From the contracts directory
cp artifacts/contracts/hedera/DeraNodeStaking.sol/DeraNodeStaking.json backend/node-staking-service/src/abis/
```

## File

- `DeraNodeStaking.json` - Node staking contract for managing HBAR staking and rewards

## Events Listened To

The service listens to these events:

```solidity
event NodeStaked(uint64 indexed nodeId, uint256 amount, uint256 timestamp);
event NodeUnstaked(uint64 indexed nodeId, uint256 amount, uint256 timestamp);
event RewardsClaimed(uint64 indexed nodeId, uint256 amount, uint256 timestamp);
event RewardsDistributed(address indexed asset, uint256 amount, uint256 timestamp);
```

## Functions Called

The service calls these contract functions:

```solidity
function recordStakingRewards(uint64 nodeId, uint256 rewardAmount) external;
function distributeRewardsToAsset(address asset, uint256 rewardAmount) external;
function getStakingInfo() external view returns (...);
function getNodeStakeInfo(uint64 nodeId) external view returns (...);
```
