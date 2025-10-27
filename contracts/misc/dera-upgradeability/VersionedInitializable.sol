// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VersionedInitializable
 * @author DERA Protocol
 * @notice Helper for upgradeable contracts initialization on Hedera
 * @dev Prevents re-initialization attacks in proxy pattern
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: Tracks initialization state on-chain
 * - HCS (Hedera Consensus Service): Initialization events logged via proxy
 * - Mirror Nodes: Initialization history queryable via REST API
 * 
 * INTEGRATION:
 * - Proxy Pattern: Used with EIP-1967 transparent proxy
 * - Storage Gap: 50 slots reserved for future upgrades
 * - Revision Tracking: Each upgrade increments revision number
 */
abstract contract VersionedInitializable {
  uint256 private lastInitializedRevision = 0;
  bool private initializing;

  constructor() {
    lastInitializedRevision = getRevision();
  }

  modifier initializer() {
    uint256 revision = getRevision();
    require(initializing || isConstructor() || revision > lastInitializedRevision, 'Contract instance has already been initialized');

    bool isTopLevelCall = !initializing;
    if (isTopLevelCall) {
      initializing = true;
      lastInitializedRevision = revision;
    }

    _;

    if (isTopLevelCall) {
      initializing = false;
    }
  }

  function getRevision() internal pure virtual returns (uint256);

  function isConstructor() private view returns (bool) {
    uint256 cs;
    assembly {
      cs := extcodesize(address())
    }
    return cs == 0;
  }

  uint256[50] private ______gap;
}
