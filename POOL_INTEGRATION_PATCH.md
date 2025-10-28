# Pool.sol Integration Patch

## Changes Required to contracts/protocol/pool/Pool.sol

### 1. Add Import for HCS Interface

**Location:** After line 35 (after other imports)

```solidity
import {IDeraHCSEventStreamer} from '../../interfaces/IDeraHCSEventStreamer.sol';
```

### 2. Add User Registry Events

**Location:** After line 126 (after existing events)

```solidity
event UserRegistered(address indexed user, uint256 totalUsers);
```

### 3. Add Internal Helper Functions

**Location:** After line 116 (after _safeHTSBalanceOf function, before events)

```solidity
/**
 * @notice Register user for liquidation monitoring
 * @dev Only registers if user not already registered
 * @param user Address to register
 */
function _registerUser(address user) internal {
    if (!_isRegisteredUser[user] && user != address(0)) {
        _users.push(user);
        _isRegisteredUser[user] = true;
        emit UserRegistered(user, _users.length);
    }
}

/**
 * @notice Call HCS Event Streamer if configured
 * @dev Silently fails if streamer not set (no revert)
 */
function _getHCSStreamer() internal view returns (IDeraHCSEventStreamer) {
    if (hcsEventStreamer != address(0)) {
        return IDeraHCSEventStreamer(hcsEventStreamer);
    }
    return IDeraHCSEventStreamer(address(0));
}
```

### 4. Update supply() Function

**Location:** Lines 164-182 (supply function)

**REPLACE:**
```solidity
function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) public virtual override nonReentrant whenNotPaused {
    if (amount == 0) revert InvalidAmount();
    require(_poolAssets[asset].id != 0 || _assetsList[0] == asset, Errors.AssetNotListed());

    SupplyLogic.executeSupply(
      _poolAssets,
      _assetsList,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteSupplyParams({
        user: _msgSender(),
        asset: asset,
        interestRateStrategyAddress: RESERVE_INTEREST_RATE_STRATEGY,
        amount: amount,
        onBehalfOf: onBehalfOf,
        referralCode: referralCode
      })
    );
    emit Supply(_msgSender(), asset, amount, onBehalfOf, referralCode, HCSTopics.SUPPLY_TOPIC());
}
```

**WITH:**
```solidity
function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) public virtual override nonReentrant whenNotPaused {
    if (amount == 0) revert InvalidAmount();
    require(_poolAssets[asset].id != 0 || _assetsList[0] == asset, Errors.AssetNotListed());

    // Register user for liquidation monitoring
    _registerUser(onBehalfOf);

    SupplyLogic.executeSupply(
      _poolAssets,
      _assetsList,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteSupplyParams({
        user: _msgSender(),
        asset: asset,
        interestRateStrategyAddress: RESERVE_INTEREST_RATE_STRATEGY,
        amount: amount,
        onBehalfOf: onBehalfOf,
        referralCode: referralCode
      })
    );

    emit Supply(_msgSender(), asset, amount, onBehalfOf, referralCode, HCSTopics.SUPPLY_TOPIC());

    // Queue event to HCS if streamer is configured
    IDeraHCSEventStreamer streamer = _getHCSStreamer();
    if (address(streamer) != address(0)) {
        try streamer.queueSupplyEvent(_msgSender(), asset, amount, onBehalfOf, referralCode) {
            // Success - event queued for HCS submission
        } catch {
            // Silently fail - don't revert transaction if HCS queueing fails
        }
    }
}
```

### 5. Update withdraw() Function

**Location:** Lines 186-201 (withdraw function)

**ADD AFTER line 199 (after emit Withdraw):**

```solidity
    // Queue event to HCS if streamer is configured
    IDeraHCSEventStreamer streamer = _getHCSStreamer();
    if (address(streamer) != address(0)) {
        try streamer.queueWithdrawEvent(_msgSender(), asset, withdrawn, to) {
            // Success
        } catch {
            // Silently fail
        }
    }
```

### 6. Update borrow() Function

**Location:** Find borrow function

**ADD AFTER borrow logic execution:**

```solidity
    // Register user for liquidation monitoring
    _registerUser(onBehalfOf);

    // ... existing borrow logic ...

    emit Borrow(_msgSender(), asset, amount, interestRateMode, onBehalfOf, referralCode, HCSTopics.BORROW_TOPIC());

    // Queue event to HCS if streamer is configured
    IDeraHCSEventStreamer streamer = _getHCSStreamer();
    if (address(streamer) != address(0)) {
        try streamer.queueBorrowEvent(_msgSender(), asset, amount, interestRateMode, onBehalfOf, referralCode) {
            // Success
        } catch {
            // Silently fail
        }
    }
```

### 7. Update repay() Function

**Location:** Find repay function

**ADD AFTER repay logic:**

```solidity
    emit Repay(_msgSender(), asset, amountRepaid, interestRateMode, onBehalfOf, HCSTopics.REPAY_TOPIC());

    // Queue event to HCS if streamer is configured
    IDeraHCSEventStreamer streamer = _getHCSStreamer();
    if (address(streamer) != address(0)) {
        try streamer.queueRepayEvent(_msgSender(), asset, amountRepaid, interestRateMode, onBehalfOf) {
            // Success
        } catch {
            // Silently fail
        }
    }
```

### 8. Update liquidationCall() Function

**Location:** Find liquidationCall function

**ADD AFTER liquidation logic:**

```solidity
    emit LiquidationCall(_msgSender(), user, collateralAsset, debtAsset, debtToCover, receiveSupplyToken, HCSTopics.LIQUIDATION_TOPIC());

    // Queue event to HCS if streamer is configured
    IDeraHCSEventStreamer streamer = _getHCSStreamer();
    if (address(streamer) != address(0)) {
        try streamer.queueLiquidationEvent(
            _msgSender(),
            user,
            collateralAsset,
            debtAsset,
            debtToCover,
            liquidatedCollateral,
            receiveSupplyToken
        ) {
            // Success
        } catch {
            // Silently fail
        }
    }
```

### 9. Add Public View Functions for User Registry

**Location:** End of contract (before final closing brace)

```solidity
/**
 * @notice Get all registered users
 * @dev Used by liquidation bots to discover users to monitor
 * @return Array of all user addresses
 */
function getAllUsers() external view returns (address[] memory) {
    return _users;
}

/**
 * @notice Get total number of registered users
 * @return Count of registered users
 */
function getUserCount() external view returns (uint256) {
    return _users.length;
}

/**
 * @notice Get user at specific index
 * @param index Index in users array
 * @return User address at index
 */
function getUserAtIndex(uint256 index) external view returns (address) {
    require(index < _users.length, "Index out of bounds");
    return _users[index];
}

/**
 * @notice Check if address is a registered user
 * @param user Address to check
 * @return True if user is registered
 */
function isRegisteredUser(address user) external view returns (bool) {
    return _isRegisteredUser[user];
}

/**
 * @notice Get paginated list of users
 * @dev Useful for bots with many users to avoid gas limits
 * @param offset Starting index
 * @param limit Number of users to return
 * @return users Array of user addresses
 * @return total Total number of users
 */
function getUsersPaginated(uint256 offset, uint256 limit)
    external
    view
    returns (address[] memory users, uint256 total)
{
    total = _users.length;

    if (offset >= total) {
        return (new address[](0), total);
    }

    uint256 end = offset + limit;
    if (end > total) {
        end = total;
    }

    uint256 resultLength = end - offset;
    users = new address[](resultLength);

    for (uint256 i = 0; i < resultLength; i++) {
        users[i] = _users[offset + i];
    }

    return (users, total);
}
```

---

## Summary of Changes

**Files Modified:**
1. `contracts/protocol/pool/PoolStorage.sol` - ✅ DONE (added user registry)
2. `contracts/protocol/pool/Pool.sol` - ⏳ PENDING (needs manual application of patches above)
3. `contracts/interfaces/IDeraHCSEventStreamer.sol` - ✅ DONE (created interface)

**New Functionality:**
- ✅ User registry tracks all users who supply or borrow
- ✅ HCS Event Streamer called after each operation
- ✅ Graceful failure if HCS streamer not configured
- ✅ Paginated user queries for large-scale liquidation bots
- ✅ getAllUsers() for liquidation bot discovery

**Testing Required:**
1. Deploy updated Pool contract
2. Execute supply transaction → verify user registered
3. Execute borrow transaction → verify user registered
4. Call getAllUsers() → verify users returned
5. Verify HCSEventQueued events emitted
6. Verify HCS service picks up queued events

**Next Steps:**
1. Apply patches to Pool.sol
2. Redeploy Pool contract
3. Update IPool interface if needed
4. Test integration
5. Update liquidation bot to use getAllUsers()

---

## Why Try-Catch for HCS Calls?

We use try-catch blocks when calling the HCS streamer because:

1. **Non-Critical Functionality**: HCS event logging is important but not critical to core protocol operation
2. **Graceful Degradation**: If HCS streamer fails, the transaction should still succeed
3. **Gas Safety**: Prevents out-of-gas errors in HCS streamer from reverting main transaction
4. **Deployment Flexibility**: Protocol can work without HCS streamer configured

---

## Integration with Backend Services

After these changes:

**Liquidation Bot** can now:
```javascript
// Get all users to monitor
const users = await pool.getAllUsers();

// Or paginated for large scale
const { users, total } = await pool.getUsersPaginated(0, 100);

// Monitor each user's health factor
for (const user of users) {
    const { healthFactor } = await pool.getUserAccountData(user);
    if (healthFactor < 1e18) {
        // User is liquidatable
        await executeLiquidation(user);
    }
}
```

**HCS Event Service** will receive:
- `HCSEventQueued` events from DeraHCSEventStreamer
- Event data includes all parameters
- Can submit to HCS topics via Hedera SDK
