# Dera Protocol - All Functions by Contract

**Complete function reference for all smart contracts**

---

## 🏊 Pool.sol (Main Protocol)

### User Functions
- `supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)` - Deposit assets to earn interest
- `withdraw(address asset, uint256 amount, address to)` - Withdraw supplied assets + interest
- `borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)` - Borrow assets against collateral
- `repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf)` - Repay borrowed assets
- `repayWithDTokens(address asset, uint256 amount, uint256 interestRateMode)` - Repay using dTokens directly
- `setUserUseReserveAsCollateral(address asset, bool useAsCollateral)` - Enable/disable asset as collateral
- `liquidationCall(address collateralAsset, address debtAsset, address borrower, uint256 debtToCover, bool receiveDToken)` - Liquidate undercollateralized positions
- `setUserEMode(uint8 categoryId)` - Set efficiency mode category
- `finalizeTransfer(address asset, address from, address to, uint256 scaledAmount, uint256 scaledBalanceFromBefore, uint256 scaledBalanceToBefore)` - Finalize dToken transfers

### View Functions
- `getUserAccountData(address user)` - Get user's collateral, debt, health factor
- `getReserveData(address asset)` - Get reserve configuration and rates
- `getConfiguration(address asset)` - Get reserve configuration
- `getUserConfiguration(address user)` - Get user's collateral/borrow config
- `getReserveNormalizedIncome(address asset)` - Get liquidity index
- `getReserveNormalizedVariableDebt(address asset)` - Get borrow index
- `getReservesList()` - Get all supported assets
- `getReservesCount()` - Get total number of reserves
- `getReserveAddressById(uint16 id)` - Get reserve address by ID
- `getReserveDToken(address asset)` - Get dToken address for asset
- `getReserveVariableDebtToken(address asset)` - Get debt token address
- `getVirtualUnderlyingBalance(address asset)` - Get virtual balance
- `getReserveDeficit(address asset)` - Get reserve deficit
- `getLiquidationGracePeriod(address asset)` - Get liquidation grace period
- `getUserEMode(address user)` - Get user's E-Mode category
- `getEModeCategoryData(uint8 id)` - Get E-Mode category configuration
- `getEModeCategoryLabel(uint8 id)` - Get E-Mode category label
- `getEModeCategoryCollateralConfig(uint8 id)` - Get E-Mode collateral config
- `getEModeCategoryCollateralBitmap(uint8 id)` - Get E-Mode collateral bitmap
- `getEModeCategoryBorrowableBitmap(uint8 id)` - Get E-Mode borrowable bitmap
- `MAX_NUMBER_RESERVES()` - Get maximum reserves allowed
- `POOL_REVISION()` - Get pool version
- `getRevision()` - Get contract revision

### Admin Functions
- `initialize(IPoolAddressesProvider provider)` - Initialize pool
- `initReserve(address asset, address dTokenAddress, address variableDebtAddress)` - Add new reserve
- `setConfiguration(address asset, DataTypes.ReserveConfigurationMap configuration)` - Update reserve config
- `dropReserve(address asset)` - Remove reserve
- `syncIndexesState(address asset)` - Sync reserve indexes
- `syncRatesState(address asset)` - Sync interest rates
- `setLiquidationGracePeriod(address asset, uint40 until)` - Set liquidation grace period
- `resetIsolationModeTotalDebt(address asset)` - Reset isolation mode debt
- `rescueTokens(address token, address to, uint256 amount)` - Rescue stuck tokens
- `mintToTreasury(address[] assets)` - Mint accrued fees to treasury
- `configureEModeCategory(uint8 id, DataTypes.EModeCategoryBaseConfiguration category)` - Configure E-Mode
- `configureEModeCategoryCollateralBitmap(uint8 id, uint128 collateralBitmap)` - Set E-Mode collateral bitmap
- `configureEModeCategoryBorrowableBitmap(uint8 id, uint128 borrowableBitmap)` - Set E-Mode borrowable bitmap

---

## 🪙 DToken.sol (Interest-Bearing Deposit Token)

### User Functions
- `transfer(address to, uint256 amount)` - Transfer dTokens
- `transferFrom(address from, address to, uint256 amount)` - Transfer dTokens from another address
- `approve(address spender, uint256 amount)` - Approve spending
- `permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)` - Gasless approval

### View Functions
- `balanceOf(address user)` - Get dToken balance (includes accrued interest)
- `totalSupply()` - Get total dToken supply
- `scaledBalanceOf(address user)` - Get scaled balance (without interest)
- `scaledTotalSupply()` - Get scaled total supply
- `allowance(address owner, address spender)` - Get spending allowance
- `name()` - Get token name
- `symbol()` - Get token symbol
- `decimals()` - Get token decimals
- `UNDERLYING_ASSET_ADDRESS()` - Get underlying asset address
- `RESERVE_TREASURY_ADDRESS()` - Get treasury address
- `DOMAIN_SEPARATOR()` - Get EIP-712 domain separator
- `nonces(address owner)` - Get permit nonce
- `DTOKEN_REVISION()` - Get dToken version
- `getRevision()` - Get contract revision

### Pool Functions
- `mint(address caller, address onBehalfOf, uint256 scaledAmount, uint256 index)` - Mint dTokens
- `burn(address from, address receiverOfUnderlying, uint256 amount, uint256 scaledAmount, uint256 index)` - Burn dTokens
- `mintToTreasury(uint256 scaledAmount, uint256 index)` - Mint fees to treasury
- `transferOnLiquidation(address from, address to, uint256 amount, uint256 scaledAmount, uint256 index)` - Transfer during liquidation
- `transferUnderlyingTo(address target, uint256 amount)` - Transfer underlying asset

### Admin Functions
- `initialize(IPool pool, address underlyingAsset, uint8 dTokenDecimals, string dTokenName, string dTokenSymbol, bytes params)` - Initialize dToken
- `rescueTokens(address token, address to, uint256 amount)` - Rescue stuck tokens

---

## 💳 VariableDebtToken.sol (Debt Tracking Token)

### View Functions
- `balanceOf(address user)` - Get debt balance (includes accrued interest)
- `totalSupply()` - Get total debt
- `scaledBalanceOf(address user)` - Get scaled debt balance
- `scaledTotalSupply()` - Get scaled total debt
- `name()` - Get token name
- `symbol()` - Get token symbol
- `decimals()` - Get token decimals
- `UNDERLYING_ASSET_ADDRESS()` - Get underlying asset address
- `DEBT_TOKEN_REVISION()` - Get debt token version
- `getRevision()` - Get contract revision

### Pool Functions
- `mint(address user, address onBehalfOf, uint256 amount, uint256 index)` - Mint debt tokens
- `burn(address from, uint256 amount, uint256 index)` - Burn debt tokens

### Admin Functions
- `initialize(IPool pool, address underlyingAsset, uint8 debtTokenDecimals, string debtTokenName, string debtTokenSymbol, bytes params)` - Initialize debt token

---

## 🔮 DeraOracle.sol (Price Oracle)

### View Functions
- `getAssetPrice(address asset)` - Get asset price in USD (8 decimals)
- `getLatestPrice(address asset)` - Get latest price without staleness check
- `hasPriceFeed(address asset)` - Check if price feed exists
- `assetToPriceId(address asset)` - Get Pyth price feed ID
- `maxPriceAge()` - Get maximum price age
- `fallbackEnabled()` - Check if fallback mode enabled

### Admin Functions
- `setAssetPriceFeed(address asset, bytes32 priceId)` - Set Pyth price feed for asset
- `setAssetPriceFeeds(address[] assets, bytes32[] priceIds)` - Set multiple price feeds
- `setMaxPriceAge(uint256 newMaxAge)` - Update maximum price age
- `setFallbackPrice(address asset, uint256 price)` - Set emergency fallback price
- `setFallbackEnabled(bool enabled)` - Toggle fallback mode

---

## 🎁 RewardsController.sol (Liquidity Mining)

### User Functions
- `claimRewards(address[] assets, address to)` - Claim DERA rewards

### View Functions
- `getUnclaimedRewards(address user, address[] assets)` - Get unclaimed rewards
- `rewardData(address asset)` - Get reward configuration for asset
- `userRewardData(address user, address asset)` - Get user reward data
- `totalSupply(address asset)` - Get total supply for asset
- `REWARDS_CONTROLLER_REVISION()` - Get controller version
- `getRevision()` - Get contract revision

### Admin Functions
- `configureReward(address asset, uint256 emissionPerSecond, uint256 duration)` - Configure rewards for asset
- `updateTotalSupply(address asset, uint256 newTotalSupply)` - Update total supply

---

## 💰 Collector.sol (Treasury)

### View Functions
- `getStream(uint256 streamId)` - Get vesting stream details
- `balanceOf(uint256 streamId, address who)` - Get stream balance
- `deltaOf(uint256 streamId)` - Get time elapsed in stream
- `getNextStreamId()` - Get next stream ID
- `COLLECTOR_REVISION()` - Get collector version
- `getRevision()` - Get contract revision

### Admin Functions
- `transfer(IERC20 token, address recipient, uint256 amount)` - Transfer tokens from treasury
- `approve(IERC20 token, address spender, uint256 amount)` - Approve token spending
- `createStream(address recipient, uint256 deposit, address tokenAddress, uint256 startTime, uint256 stopTime)` - Create vesting stream
- `withdrawFromStream(uint256 streamId, uint256 amount)` - Withdraw from stream
- `cancelStream(uint256 streamId)` - Cancel vesting stream

---

## 💸 RevenueSplitter.sol (Revenue Distribution)

### User Functions
- `splitRevenue(IERC20[] tokens)` - Split revenue for HTS tokens
- `splitNativeRevenue()` - Split HBAR revenue

### View Functions
- `RECIPIENT_A()` - Get first recipient address
- `RECIPIENT_B()` - Get second recipient address
- `SPLIT_PERCENTAGE_RECIPIENT_A()` - Get split percentage
- `REVENUE_SPLITTER_REVISION()` - Get splitter version
- `getRevision()` - Get contract revision

---

## 🔐 ACLManager.sol (Access Control)

### View Functions
- `isPoolAdmin(address admin)` - Check if address is pool admin
- `isEmergencyAdmin(address admin)` - Check if address is emergency admin
- `isRiskAdmin(address admin)` - Check if address is risk admin
- `isAssetListingAdmin(address admin)` - Check if address is asset listing admin
- `POOL_ADMIN_ROLE()` - Get pool admin role hash
- `EMERGENCY_ADMIN_ROLE()` - Get emergency admin role hash
- `RISK_ADMIN_ROLE()` - Get risk admin role hash
- `ASSET_LISTING_ADMIN_ROLE()` - Get asset listing admin role hash
- `ACL_MANAGER_REVISION()` - Get ACL manager version
- `getRevision()` - Get contract revision

### Admin Functions
- `setRoleAdmin(bytes32 role, bytes32 adminRole)` - Set role admin
- `addPoolAdmin(address admin)` - Add pool admin
- `removePoolAdmin(address admin)` - Remove pool admin
- `addEmergencyAdmin(address admin)` - Add emergency admin
- `removeEmergencyAdmin(address admin)` - Remove emergency admin
- `addRiskAdmin(address admin)` - Add risk admin
- `removeRiskAdmin(address admin)` - Remove risk admin
- `addAssetListingAdmin(address admin)` - Add asset listing admin
- `removeAssetListingAdmin(address admin)` - Remove asset listing admin

---

## 📍 PoolAddressesProvider.sol (Address Registry)

### View Functions
- `getMarketId()` - Get market identifier
- `getAddress(bytes32 id)` - Get address by ID
- `getPool()` - Get Pool contract address
- `getPoolConfigurator()` - Get PoolConfigurator address
- `getPriceOracle()` - Get oracle address
- `getACLManager()` - Get ACL manager address
- `getACLAdmin()` - Get ACL admin address
- `getPriceOracleSentinel()` - Get oracle sentinel address
- `getPoolDataProvider()` - Get data provider address

### Admin Functions
- `setMarketId(string newMarketId)` - Set market ID
- `setAddress(bytes32 id, address newAddress)` - Set address by ID
- `setAddressAsProxy(bytes32 id, address newImplementationAddress)` - Set address with proxy
- `setPoolImpl(address newPoolImpl)` - Update Pool implementation
- `setPoolConfiguratorImpl(address newPoolConfiguratorImpl)` - Update PoolConfigurator implementation
- `setPriceOracle(address newPriceOracle)` - Set oracle address
- `setACLManager(address newAclManager)` - Set ACL manager
- `setACLAdmin(address newAclAdmin)` - Set ACL admin
- `setPriceOracleSentinel(address newPriceOracleSentinel)` - Set oracle sentinel
- `setPoolDataProvider(address newDataProvider)` - Set data provider

---

## ⚙️ PoolConfigurator.sol (Reserve Configuration)

### Admin Functions
- `initReserves(ConfiguratorInputTypes.InitReserveInput[] input)` - Initialize multiple reserves
- `updateDToken(ConfiguratorInputTypes.UpdateDTokenInput input)` - Update dToken implementation
- `updateVariableDebtToken(ConfiguratorInputTypes.UpdateDebtTokenInput input)` - Update debt token implementation
- `setReserveBorrowing(address asset, bool enabled)` - Enable/disable borrowing
- `configureReserveAsCollateral(address asset, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus)` - Configure collateral parameters
- `setReserveActive(address asset, bool active)` - Activate/deactivate reserve
- `setReserveFreeze(address asset, bool freeze)` - Freeze/unfreeze reserve
- `setReservePause(address asset, bool paused)` - Pause/unpause reserve
- `setReserveFactor(address asset, uint256 newReserveFactor)` - Set reserve factor
- `setBorrowCap(address asset, uint256 newBorrowCap)` - Set borrow cap
- `setSupplyCap(address asset, uint256 newSupplyCap)` - Set supply cap
- `setLiquidationProtocolFee(address asset, uint256 newFee)` - Set liquidation protocol fee
- `setEModeCategory(address asset, uint8 newCategoryId)` - Set E-Mode category
- `setAssetEModeCategory(address asset, uint8 newCategoryId)` - Set asset E-Mode category
- `setUnbackedMintCap(address asset, uint256 newUnbackedMintCap)` - Set unbacked mint cap
- `setDebtCeiling(address asset, uint256 newDebtCeiling)` - Set isolation mode debt ceiling
- `setSiloedBorrowing(address asset, bool newSiloed)` - Set siloed borrowing
- `setBorrowableInIsolation(address asset, bool borrowable)` - Set borrowable in isolation
- `setReserveFlashLoaning(address asset, bool enabled)` - Enable/disable flash loans

---

## 📊 UiPoolDataProviderV1.sol (Data Aggregation)

### View Functions
- `getReservesList(IPoolAddressesProvider provider)` - Get all reserves
- `getReservesData(IPoolAddressesProvider provider)` - Get all reserve data in one call
- `getUserReservesData(IPoolAddressesProvider provider, address user)` - Get user data for all reserves

---

## 🎯 LiquidationDataProvider.sol (Liquidation Helper)

### View Functions
- `getLiquidatablePositions(IPoolAddressesProvider provider, address[] users)` - Find liquidatable positions
- `isUserLiquidatable(IPoolAddressesProvider provider, address user)` - Check if user is liquidatable

---

## 💼 WalletBalanceProvider.sol (Balance Helper)

### View Functions
- `balanceOf(address user, address token)` - Get token balance
- `batchBalanceOf(address[] users, address[] tokens)` - Get multiple balances
- `getUserWalletBalances(address provider, address user)` - Get all token balances for user

---

## 📈 AnalyticsDashboard.sol (Analytics)

### View Functions
- `getDashboardData()` - Get protocol-wide metrics
- `getAllAssetsDashboard()` - Get metrics for all assets
- `getAssetDashboard(address asset)` - Get metrics for specific asset
- `getUserDashboard(address user)` - Get user-specific metrics
- `getTopSuppliers(uint256 count)` - Get top suppliers
- `users(uint256 index)` - Get user by index
- `isUser(address user)` - Check if address is registered user
- `prices24hAgo(address asset)` - Get price from 24h ago
- `lastPriceUpdate()` - Get last price update timestamp
- `ANALYTICS_DASHBOARD_REVISION()` - Get dashboard version
- `getRevision()` - Get contract revision

### Admin Functions
- `registerUser(address user)` - Register new user
- `updatePrices24h()` - Update 24h price snapshots

---

## 🔔 ProtocolMonitor.sol (Monitoring)

### View Functions
- `getProtocolMetrics()` - Get current protocol metrics
- `getAssetMetrics(address asset)` - Get asset-specific metrics
- `getUserMetrics(address user)` - Get user-specific metrics
- `getMetricsHistory(uint256 count)` - Get historical metrics
- `getRecentAlerts(uint256 count)` - Get recent alerts
- `metricsHistory(uint256 index)` - Get metrics by index
- `alerts(uint256 index)` - Get alert by index
- `highUtilizationThreshold()` - Get high utilization threshold
- `lowHealthFactorThreshold()` - Get low health factor threshold
- `largeLiquidationThreshold()` - Get large liquidation threshold
- `PROTOCOL_MONITOR_REVISION()` - Get monitor version
- `getRevision()` - Get contract revision

### Admin Functions
- `updateMetrics()` - Update protocol metrics
- `checkAlerts()` - Check and trigger alerts
- `setAlertThresholds(uint256 _highUtilization, uint256 _lowHealthFactor, uint256 _largeLiquidation)` - Set alert thresholds

---

## 📐 DefaultReserveInterestRateStrategy.sol (Interest Rates)

### View Functions
- `calculateInterestRates(DataTypes.CalculateInterestRatesParams params)` - Calculate current interest rates
- `getVariableRateSlope1()` - Get variable rate slope 1
- `getVariableRateSlope2()` - Get variable rate slope 2
- `getBaseVariableBorrowRate()` - Get base variable borrow rate
- `getMaxVariableBorrowRate()` - Get maximum variable borrow rate
- `OPTIMAL_USAGE_RATIO()` - Get optimal utilization ratio
- `OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO()` - Get optimal stable debt ratio

---

## 📊 Summary

| Contract | Public Functions | View Functions | Admin Functions |
|----------|------------------|----------------|-----------------|
| Pool.sol | 9 | 24 | 13 |
| DToken.sol | 4 | 12 | 6 |
| VariableDebtToken.sol | 0 | 8 | 3 |
| DeraOracle.sol | 0 | 6 | 5 |
| RewardsController.sol | 1 | 5 | 2 |
| Collector.sol | 0 | 6 | 5 |
| RevenueSplitter.sol | 2 | 4 | 0 |
| ACLManager.sol | 0 | 8 | 9 |
| PoolAddressesProvider.sol | 0 | 9 | 11 |
| PoolConfigurator.sol | 0 | 0 | 20+ |
| UiPoolDataProviderV1.sol | 0 | 3 | 0 |
| LiquidationDataProvider.sol | 0 | 2 | 0 |
| WalletBalanceProvider.sol | 0 | 3 | 0 |
| AnalyticsDashboard.sol | 0 | 10 | 2 |
| ProtocolMonitor.sol | 0 | 11 | 3 |
| InterestRateStrategy.sol | 0 | 6 | 0 |

**Total Functions: 200+ across all contracts**

---

*Dera Protocol - Complete Function Reference*
*Last Updated: 2024*
