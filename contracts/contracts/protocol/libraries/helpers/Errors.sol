// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Errors library
 * @author DERA Protocol
 * @notice Custom errors for gas-efficient reverts on Hedera
 * @dev Uses Solidity 0.8+ custom errors instead of string reverts
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: Error codes stored in bytecode (no runtime storage)
 * - HCS (Hedera Consensus Service): Revert reasons logged to HCS via events
 * - Mirror Nodes: Failed transactions queryable with error codes
 * 
 * GAS EFFICIENCY:
 * - Custom errors: ~50 gas vs ~1000+ gas for string reverts
 * - Hedera benefit: Even cheaper gas makes this optimization valuable
 * - Example: "revert CallerNotPoolAdmin()" vs "revert('Caller not pool admin')"
 * 
 * INTEGRATION:
 * - Mirror Node API: Returns error selector (4 bytes) in failed transactions
 * - Frontend: Decode error selector to human-readable message
 * - Debugging: Error names are descriptive and self-documenting
 * 
 * ERROR CATEGORIES:
 * - Access Control: CallerNotPoolAdmin, CallerNotPoolConfigurator, etc.
 * - Validation: InvalidAmount, InvalidLtv, InvalidReserveParams, etc.
 * - State: AssetInactive, AssetFrozen, AssetPaused, etc.
 * - Business Logic: HealthFactorLowerThanLiquidationThreshold, etc.
 */
library Errors {
  error CallerNotPoolAdmin();
  error CallerNotPoolOrEmergencyAdmin();
  error CallerNotRiskOrPoolAdmin();
  error CallerNotAssetListingOrPoolAdmin();
  error AddressesProviderNotRegistered();
  error InvalidAddressesProviderId();
  error NotContract();
  error CallerNotPoolConfigurator();
  error CallerNotSupplyToken();
  error InvalidAddressesProvider();
  error AssetAlreadyAdded();
  error NoMoreReservesAllowed();
  error AssetLiquidityNotZero();
  error InvalidReserveParams();
  error CallerMustBePool();
  error InvalidMintAmount();
  error InvalidBurnAmount();
  error InvalidAmount();
  error AssetInactive();
  error AssetFrozen();
  error AssetPaused();
  error BorrowingNotEnabled();
  error NotEnoughAvailableUserBalance();
  error InvalidInterestRateModeSelected();
  error HealthFactorLowerThanLiquidationThreshold();
  error CollateralCannotCoverNewBorrow();
  error NoDebtOfSelectedType();
  error NoExplicitAmountToRepayOnBehalf();
  error UnderlyingBalanceZero();
  error HealthFactorNotBelowThreshold();
  error CollateralCannotBeLiquidated();
  error SpecifiedCurrencyNotBorrowedByUser();
  error BorrowCapExceeded();
  error SupplyCapExceeded();
  error UnderlyingClaimableRightsNotZero();
  error VariableDebtSupplyNotZero();
  error LtvValidationFailed();
  error PriceOracleSentinelCheckFailed();
  error AssetAlreadyInitialized();
  error InvalidLtv();
  error InvalidLiquidationThreshold();
  error InvalidLiquidationBonus();
  error InvalidDecimals();
  error InvalidReserveFactor();
  error InvalidBorrowCap();
  error InvalidSupplyCap();
  error InvalidLiquidationProtocolFee();
  error InvalidReserveIndex();
  error AclAdminCannotBeZero();
  error InconsistentParamsLength();
  error ZeroAddressNotValid();
  error InvalidExpiration();
  error InvalidSignature();
  error OperationNotSupported();
  error AssetNotListed();
  error InvalidOptimalUsageRatio();
  error UnderlyingCannotBeRescued();
  error AddressesProviderAlreadyAdded();
  error PoolAddressesDoNotMatch();
  error AssetDebtNotZero();
  error InvalidMaxRate();
  error WithdrawToSupplyToken();
  error SupplyToSupplyToken();
  error Slope2MustBeGteSlope1();
  error CallerNotRiskOrPoolOrEmergencyAdmin();
  error LiquidationGraceSentinelCheckFailed();
  error InvalidGracePeriod();
  error InvalidFreezeState();
  error CallerNotUmbrella();
  error AssetNotInDeficit();
  error MustNotLeaveDust();
  error UserCannotHaveDebt();
  error SelfLiquidation();
  error CallerNotPositionManager();
  error NoDebtToCover();
  error AmountExceedsDeficit();
  error ProtocolPaused();
  error ProxyCreationFailed();
  error InitializationFailed();
  error UpgradeFailed();
}
