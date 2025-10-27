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
 * - State: ReserveInactive, ReserveFrozen, ReservePaused, etc.
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
  error CallerNotDToken();
  error InvalidAddressesProvider();
  error InvalidFlashloanExecutorReturn();
  error ReserveAlreadyAdded();
  error NoMoreReservesAllowed();
  error EModeCategoryReserved();
  error ReserveLiquidityNotZero();
  error FlashloanPremiumInvalid();
  error InvalidReserveParams();
  error InvalidEmodeCategoryParams();
  error CallerMustBePool();
  error InvalidMintAmount();
  error InvalidBurnAmount();
  error InvalidAmount();
  error ReserveInactive();
  error ReserveFrozen();
  error ReservePaused();
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
  error InconsistentFlashloanParams();
  error BorrowCapExceeded();
  error SupplyCapExceeded();
  error DebtCeilingExceeded();
  error UnderlyingClaimableRightsNotZero();
  error VariableDebtSupplyNotZero();
  error LtvValidationFailed();
  error InconsistentEModeCategory();
  error PriceOracleSentinelCheckFailed();
  error AssetNotBorrowableInIsolation();
  error ReserveAlreadyInitialized();
  error UserInIsolationModeOrLtvZero();
  error InvalidLtv();
  error InvalidLiquidationThreshold();
  error InvalidLiquidationBonus();
  error InvalidDecimals();
  error InvalidReserveFactor();
  error InvalidBorrowCap();
  error InvalidSupplyCap();
  error InvalidLiquidationProtocolFee();
  error InvalidDebtCeiling();
  error InvalidReserveIndex();
  error AclAdminCannotBeZero();
  error InconsistentParamsLength();
  error ZeroAddressNotValid();
  error InvalidExpiration();
  error InvalidSignature();
  error OperationNotSupported();
  error DebtCeilingNotZero();
  error AssetNotListed();
  error InvalidOptimalUsageRatio();
  error UnderlyingCannotBeRescued();
  error AddressesProviderAlreadyAdded();
  error PoolAddressesDoNotMatch();
  error SiloedBorrowingViolation();
  error ReserveDebtNotZero();
  error FlashloanDisabled();
  error InvalidMaxRate();
  error WithdrawToDToken();
  error SupplyToDToken();
  error Slope2MustBeGteSlope1();
  error CallerNotRiskOrPoolOrEmergencyAdmin();
  error LiquidationGraceSentinelCheckFailed();
  error InvalidGracePeriod();
  error InvalidFreezeState();
  error NotBorrowableInEMode();
  error CallerNotUmbrella();
  error ReserveNotInDeficit();
  error MustNotLeaveDust();
  error UserCannotHaveDebt();
  error SelfLiquidation();
  error CallerNotPositionManager();
}
