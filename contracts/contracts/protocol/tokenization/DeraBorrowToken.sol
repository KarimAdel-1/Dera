// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {VersionedInitializable} from '../../misc/dera-upgradeability/VersionedInitializable.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IInitializableDeraBorrowToken} from '../../interfaces/IInitializableDeraBorrowToken.sol';
import {IDeraBorrowToken} from '../../interfaces/IDeraBorrowToken.sol';
import {ScaledBalanceTokenBase} from './base/ScaledBalanceTokenBase.sol';
import {TokenMath} from '../libraries/helpers/TokenMath.sol';

/**
 * @title DeraBorrowToken (DBT)
 * @author Dera Protocol
 * @notice Debt tracking token (non-transferable) representing borrowed positions with accrued interest
 *
 * HEDERA TOOLS USED:
 * - HTS (Hedera Token Service): Debt tracking via HTS token (non-transferable)
 * - Smart Contract State: Debt balances stored in contract state, not actual HTS transfers
 *
 * INTEGRATION:
 * - HTS: Token created via HTS but marked non-transferable
 * - State-based: Debt tracked in contract storage with indexed balances
 * - No transfers: All transfer functions revert (debt cannot be transferred)
 * - Interest accrual: Balance grows automatically via borrow index
 *
 * DERA PROTOCOL:
 * - Unique to Dera: Represents borrow positions in lending pools
 * - Fully HTS-native implementation designed specifically for Hedera
 */
abstract contract DeraBorrowToken is VersionedInitializable, ScaledBalanceTokenBase, IDeraBorrowToken {
  using TokenMath for uint256;
  using SafeCast for uint256;

  address internal _underlyingAsset;

  constructor(IPool pool) ScaledBalanceTokenBase(pool, 'DBT_IMPL', 'DBT_IMPL', 0) {}

  function initialize(IPool initializingPool, address underlyingAsset, uint8 borrowTokenDecimals, string memory borrowTokenName, string memory borrowTokenSymbol, bytes calldata params) external virtual;

  function balanceOf(address user) public view virtual override returns (uint256) {
    return super.balanceOf(user).getBorrowTokenBalance(POOL.getAssetNormalizedVariableDebt(_underlyingAsset));
  }

  function mint(address user, address onBehalfOf, uint256 amount, uint256 scaledAmount, uint256 index) external virtual override onlyPool returns (uint256) {
    if (user != onBehalfOf) revert Errors.OperationNotSupported();
    
    _mintScaled({
      caller: user,
      onBehalfOf: onBehalfOf,
      amountScaled: scaledAmount,
      index: index,
      getTokenBalance: TokenMath.getBorrowTokenBalance
    });
    
    return scaledTotalSupply();
  }

  function burn(address from, uint256 scaledAmount, uint256 index) external virtual override onlyPool returns (bool, uint256) {
    return (
      _burnScaled({
        user: from,
        target: address(0),
        amountScaled: scaledAmount,
        index: index,
        getTokenBalance: TokenMath.getBorrowTokenBalance
      }),
      scaledTotalSupply()
    );
  }

  function totalSupply() public view virtual override returns (uint256) {
    return super.totalSupply().getBorrowTokenBalance(POOL.getAssetNormalizedVariableDebt(_underlyingAsset));
  }

  function UNDERLYING_ASSET_ADDRESS() external view override returns (address) {
    return _underlyingAsset;
  }

  function transfer(address, uint256) external virtual override returns (bool) {
    revert Errors.OperationNotSupported();
  }

  function allowance(address, address) external view virtual override returns (uint256) {
    revert Errors.OperationNotSupported();
  }

  function approve(address, uint256) external virtual override returns (bool) {
    revert Errors.OperationNotSupported();
  }

  function transferFrom(address, address, uint256) external virtual override returns (bool) {
    revert Errors.OperationNotSupported();
  }

  function increaseAllowance(address, uint256) external virtual override returns (bool) {
    revert Errors.OperationNotSupported();
  }

  function decreaseAllowance(address, uint256) external virtual override returns (bool) {
    revert Errors.OperationNotSupported();
  }

  function DEBT_TOKEN_REVISION() public pure virtual returns (uint256) {
    return 1;
  }

  function getRevision() internal pure virtual override returns (uint256) {
    return DEBT_TOKEN_REVISION();
  }
}
