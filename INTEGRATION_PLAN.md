# Dera Protocol - Integration Plan

## Overview

This document outlines critical integration tasks needed to connect all built features and make Dera Protocol fully operational.

## Current State Analysis

### ✅ What's Built (Features #1-9)
- Feature #1: Pyth Oracle Integration (DeraOracle.sol exists)
- Feature #2: Testing Suite (Hardhat tests)
- Feature #3: Liquidation Bot (backend service ready)
- Feature #4: HCS Event Service (backend service ready)
- Feature #5: Node Staking Service (backend service ready)
- Feature #6: Monitoring & Emergency Controls (service ready)
- Feature #7: Wallet Integration (HashPack + Blade services)
- Feature #8: Rate Limiting & Anti-MEV (service ready)
- Feature #9: Deployment Scripts (ready to use)

### ❌ Critical Integration Gaps

1. **HCS Integration** - Pool.sol doesn't call HCSEventStreamer
2. **User Registry** - No way to discover users for liquidation
3. **ABI Exports** - Backend services missing contract ABIs
4. **Helper Contracts** - LiquidationDataProvider missing
5. **Utility Services** - Rate Updater and Treasury services missing
6. **Frontend Integration** - Wallet services not connected to UI

---

## 🔴 PHASE 1: Critical Contract Fixes (4-6 hours)

### Task 1.1: Fix HCS Integration in Pool.sol

**Priority:** CRITICAL
**Effort:** 2 hours
**Files:** `contracts/protocol/pool/Pool.sol`, `contracts/protocol/pool/PoolStorage.sol`

**Changes Required:**

1. **Add to PoolStorage.sol:**
```solidity
// contracts/protocol/libraries/types/PoolStorage.sol
IDeraHCSEventStreamer internal _hcsStreamer;
```

2. **Update Pool.sol initialize():**
```solidity
function initialize(IPoolAddressesProvider provider) external override initializer {
    // ... existing code ...

    address streamer = provider.getHCSEventStreamer();
    if (streamer != address(0)) {
        _hcsStreamer = IDeraHCSEventStreamer(streamer);
    }
}
```

3. **Update all core functions:**
- supply() → call _hcsStreamer.queueSupplyEvent()
- withdraw() → call _hcsStreamer.queueWithdrawEvent()
- borrow() → call _hcsStreamer.queueBorrowEvent()
- repay() → call _hcsStreamer.queueRepayEvent()
- liquidationCall() → call _hcsStreamer.queueLiquidationEvent()

**Testing:**
- Deploy updated Pool
- Execute supply transaction
- Verify HCSEventQueued event is emitted
- Verify HCS service picks up the event

---

### Task 1.2: Add User Registry to Pool.sol

**Priority:** CRITICAL
**Effort:** 2 hours
**Files:** `contracts/protocol/pool/Pool.sol`, `contracts/protocol/pool/PoolStorage.sol`

**Changes Required:**

1. **Add to PoolStorage.sol:**
```solidity
// User registry for liquidation monitoring
address[] internal _users;
mapping(address => bool) internal _isRegisteredUser;
```

2. **Add helper function to Pool.sol:**
```solidity
function _registerUser(address user) internal {
    if (!_isRegisteredUser[user] && user != address(0)) {
        _users.push(user);
        _isRegisteredUser[user] = true;
        emit UserRegistered(user, _users.length);
    }
}
```

3. **Update core functions:**
```solidity
function supply(..., address onBehalfOf, ...) {
    _registerUser(onBehalfOf);
    // ... existing code ...
}

function borrow(..., address onBehalfOf) {
    _registerUser(onBehalfOf);
    // ... existing code ...
}
```

4. **Add view functions:**
```solidity
function getAllUsers() external view returns (address[] memory) {
    return _users;
}

function getUserCount() external view returns (uint256) {
    return _users.length;
}

function getUserAtIndex(uint256 index) external view returns (address) {
    require(index < _users.length, "Index out of bounds");
    return _users[index];
}

function isRegisteredUser(address user) external view returns (bool) {
    return _isRegisteredUser[user];
}
```

**Testing:**
- Deploy updated Pool
- Execute supply/borrow transactions
- Verify users are registered
- Query getAllUsers()
- Update liquidation bot to use getAllUsers()

---

### Task 1.3: Create LiquidationDataProvider Contract

**Priority:** CRITICAL
**Effort:** 2 hours
**Files:** `contracts/helpers/LiquidationDataProvider.sol`

**Implementation:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPool {
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    );
    function getAllUsers() external view returns (address[] memory);
}

contract LiquidationDataProvider {
    IPool public immutable POOL;
    uint256 private constant HEALTH_FACTOR_THRESHOLD = 1e18;

    constructor(address pool) {
        POOL = IPool(pool);
    }

    function getLiquidatableUsers() external view returns (
        address[] memory liquidatableUsers,
        uint256[] memory healthFactors
    ) {
        address[] memory allUsers = POOL.getAllUsers();
        uint256 count = 0;

        // First pass: count liquidatable users
        for (uint256 i = 0; i < allUsers.length; i++) {
            (, , , , , uint256 healthFactor) = POOL.getUserAccountData(allUsers[i]);
            if (healthFactor < HEALTH_FACTOR_THRESHOLD && healthFactor > 0) {
                count++;
            }
        }

        // Second pass: populate arrays
        liquidatableUsers = new address[](count);
        healthFactors = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < allUsers.length; i++) {
            (, , , , , uint256 healthFactor) = POOL.getUserAccountData(allUsers[i]);
            if (healthFactor < HEALTH_FACTOR_THRESHOLD && healthFactor > 0) {
                liquidatableUsers[index] = allUsers[i];
                healthFactors[index] = healthFactor;
                index++;
            }
        }

        return (liquidatableUsers, healthFactors);
    }
}
```

**Testing:**
- Deploy LiquidationDataProvider
- Create underwater position
- Call getLiquidatableUsers()
- Verify user is returned

---

## 🟡 PHASE 2: Backend Service Integration (4-6 hours)

### Task 2.1: Export ABIs to Backend Services

**Priority:** HIGH
**Effort:** 30 minutes
**Files:** Create `contracts/scripts/export-abis.sh`

**Implementation:**
```bash
#!/bin/bash

echo "🔧 Exporting Contract ABIs to Backend Services..."

# Compile contracts first
cd contracts
echo "Compiling contracts..."
npx hardhat compile

# Define source and target directories
ARTIFACTS_DIR="artifacts/contracts"
BACKEND_DIR="../backend"

# Function to copy ABI
copy_abi() {
    local contract_path=$1
    local contract_name=$2
    local target_dir=$3

    mkdir -p "$target_dir"
    cp "$ARTIFACTS_DIR/$contract_path/$contract_name.json" "$target_dir/"
    echo "✓ Copied $contract_name to $target_dir"
}

# Export to HCS Event Service
echo "\n📦 HCS Event Service..."
copy_abi "protocol/pool/Pool.sol" "Pool" "$BACKEND_DIR/hcs-event-service/src/abis"
copy_abi "hedera/DeraHCSEventStreamer.sol" "DeraHCSEventStreamer" "$BACKEND_DIR/hcs-event-service/src/abis"

# Export to Liquidation Bot
echo "\n📦 Liquidation Bot..."
copy_abi "protocol/pool/Pool.sol" "Pool" "$BACKEND_DIR/liquidation-bot/src/abis"
copy_abi "helpers/LiquidationDataProvider.sol" "LiquidationDataProvider" "$BACKEND_DIR/liquidation-bot/src/abis"
copy_abi "misc/DeraOracle.sol" "DeraOracle" "$BACKEND_DIR/liquidation-bot/src/abis"

# Export to Node Staking Service
echo "\n📦 Node Staking Service..."
copy_abi "hedera/DeraNodeStaking.sol" "DeraNodeStaking" "$BACKEND_DIR/node-staking-service/src/abis"
copy_abi "protocol/pool/Pool.sol" "Pool" "$BACKEND_DIR/node-staking-service/src/abis"

# Export to Monitoring Service
echo "\n📦 Monitoring Service..."
copy_abi "protocol/pool/Pool.sol" "Pool" "$BACKEND_DIR/monitoring-service/src/abis"
copy_abi "protocol/configuration/PoolConfigurator.sol" "PoolConfigurator" "$BACKEND_DIR/monitoring-service/src/abis"
copy_abi "misc/DeraOracle.sol" "DeraOracle" "$BACKEND_DIR/monitoring-service/src/abis"

echo "\n✅ All ABIs exported successfully!"
```

**Usage:**
```bash
chmod +x contracts/scripts/export-abis.sh
./contracts/scripts/export-abis.sh
```

---

### Task 2.2: Create Rate Updater Service

**Priority:** HIGH
**Effort:** 2 hours
**Files:** `backend/rate-updater-service/`

**Purpose:** Periodically updates interest rates for all assets

**Key Features:**
- Updates rates every 60 seconds
- Calls Pool.updateState() for each asset
- Monitors gas costs
- Winston logging

**Implementation:** Create standalone service similar to monitoring-service

---

### Task 2.3: Create Treasury Service

**Priority:** HIGH
**Effort:** 2 hours
**Files:** `backend/treasury-service/`

**Purpose:** Collects protocol fees and manages treasury

**Key Features:**
- Calls Pool.mintToTreasury() daily
- Tracks collected fees
- Distributes fees to treasury address
- Winston logging

---

## 🟢 PHASE 3: Frontend Integration (6-8 hours)

### Task 3.1: Integrate Wallet Services into DApp

**Priority:** HIGH
**Effort:** 4 hours

**Files to Update:**
- `frontend/app/hooks/useWallet.js` - Use new walletProvider
- `frontend/app/components/features/wallets/ConnectWalletModal.jsx` - Already updated
- `frontend/app/components/features/dera-protocol/LendingInterface.jsx` - Add wallet integration
- `frontend/services/deraProtocolService.js` - Replace with deraProtocolServiceV2

**Changes:**
1. Replace hashpackService with walletProvider
2. Update all contract calls to use deraProtocolServiceV2
3. Add collateral toggle UI
4. Add transaction confirmations

---

### Task 3.2: Add Collateral Toggle UI

**Priority:** HIGH
**Effort:** 2 hours

**Add to LendingInterface.jsx:**
```jsx
const handleCollateralToggle = async (asset, enabled) => {
  try {
    const tx = await deraProtocolService.setUserUseAssetAsCollateral(
      asset,
      enabled
    );
    toast.success(`Collateral ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    toast.error('Failed to toggle collateral');
  }
};
```

---

## 📋 Integration Testing Checklist

### Contract Integration
- [ ] Deploy updated Pool with HCS integration
- [ ] Deploy LiquidationDataProvider
- [ ] Export all ABIs
- [ ] Verify HCS events are queued
- [ ] Verify user registry works
- [ ] Test getLiquidatableUsers()

### Backend Service Integration
- [ ] Update liquidation bot to use getAllUsers()
- [ ] Verify HCS service receives events
- [ ] Test rate updater service
- [ ] Test treasury service
- [ ] Verify all services have correct ABIs

### Frontend Integration
- [ ] Test wallet connection (HashPack + Blade)
- [ ] Test supply transaction
- [ ] Test borrow transaction
- [ ] Test repay transaction
- [ ] Test collateral toggle
- [ ] Test liquidation interface

---

## 🚀 Deployment Sequence

```bash
# 1. Update and deploy contracts
npx hardhat run scripts/deploy/deployUpdatedPool.js --network testnet

# 2. Deploy helper contracts
npx hardhat run scripts/deploy/deployLiquidationDataProvider.js --network testnet

# 3. Export ABIs
./scripts/export-abis.sh

# 4. Update backend service configs with new contract addresses
# Edit .env files in each service

# 5. Start all backend services
cd backend/hcs-event-service && npm start &
cd backend/liquidation-bot && npm start &
cd backend/node-staking-service && npm start &
cd backend/monitoring-service && npm start &
cd backend/rate-updater-service && npm start &
cd backend/treasury-service && npm start &

# 6. Start frontend
cd frontend && npm run dev

# 7. Integration testing
# Follow testing checklist above
```

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Contract Fixes | HCS Integration, User Registry, LiquidationDataProvider | 6 hours |
| Phase 2: Backend Services | ABI Export, Rate Updater, Treasury | 5 hours |
| Phase 3: Frontend Integration | Wallet Integration, Collateral Toggle | 6 hours |
| Phase 4: Testing & Fixes | Integration testing, bug fixes | 8 hours |
| **TOTAL** | | **25 hours** (~3-4 days) |

---

## Success Criteria

Integration is complete when:
- ✅ Pool emits events AND queues to HCS
- ✅ Liquidation bot can discover all users
- ✅ All backend services have correct ABIs
- ✅ Frontend can connect wallets (HashPack + Blade)
- ✅ Users can supply, borrow, repay, and toggle collateral
- ✅ Liquidation bot can find and liquidate underwater positions
- ✅ HCS events are submitted and verifiable on Mirror Node
- ✅ Rates update automatically
- ✅ Treasury collects fees

---

## Post-Integration: Feature #10

After all integration is complete and tested:
- Build Governance System (Feature #10)
- Deploy to mainnet
- Launch Dera Protocol

---

## Notes

- All integration work builds on existing features (#1-9)
- No major architectural changes needed
- Focus on connecting the pieces that are already built
- Test thoroughly on testnet before mainnet
