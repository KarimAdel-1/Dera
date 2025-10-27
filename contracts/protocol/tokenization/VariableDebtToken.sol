// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {SafeCast} from '../../../dependencies/openzeppelin/contracts/SafeCast.sol';
import {VersionedInitializable} from '../../misc/dera-upgradeability/VersionedInitializable.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IInitializableDebtToken} from '../../interfaces/IInitializableDebtToken.sol';
import {IVariableDebtToken} from '../../interfaces/IVariableDebtToken.sol';
import {ScaledBalanceTokenBase} from './base/ScaledBalanceTokenBase.sol';
import {TokenMath} from '../libraries/helpers/TokenMath.sol';

/**
 * @title VariableDebtToken
 * @author Dera
 * @notice Variable rate debt token (non-transferable) on Hedera
 * 
 * HEDERA TOOLS USED:
 * - HTS (Hedera Token Service): Debt tracking via HTS token (non-transferable)
 * - Smart Contract State: Debt balances stored in contract state, not actual HTS transfers
 * 
 * INTEGRATION:
 * - HTS: Token created via HTS but marked non-transferable
 * - State-based: Debt tracked in contract storage with scaled balances
 * - No transfers: All transfer functions revert (debt cannot be transferred)
 * - Interest accrual: Balance grows automatically via variable borrow index
 */
abstract contract VariableDebtToken is VersionedInitializable, ScaledBalanceTokenBase, IVariableDebtToken {
  using TokenMath for uint256;
  using SafeCast for uint256;

  address internal _underlyingAsset;

  constructor(IPool pool, address rewardsController) ScaledBalanceTokenBase(pool, 'VARIABLE_DEBT_TOKEN_IMPL', 'VARIABLE_DEBT_TOKEN_IMPL', 0, rewardsController) {}

  function initialize(IPool initializingPool, address underlyingAsset, uint8 debtTokenDecimals, string memory debtTokenName, string memory debtTokenSymbol, bytes calldata params) external virtual;

  function balanceOf(address user) public view virtual override returns (uint256) {
    return super.balanceOf(user).getVariableDebtTokenBalance(POOL.getReserveNormalizedVariableDebt(_underlyingAsset));
  }

  function mint(address user, address onBehalfOf, uint256 amount, uint256 scaledAmount, uint256 index) external virtual override onlyPool returns (uint256) {
    require(user == onBehalfOf, Errors.OperationNotSupported());
    
    _mintScaled({
      caller: user,
      onBehalfOf: onBehalfOf,
      amountScaled: scaledAmount,
      index: index,
      getTokenBalance: TokenMath.getVariableDebtTokenBalance
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
        getTokenBalance: TokenMath.getVariableDebtTokenBalance
      }),
      scaledTotalSupply()
    );
  }

  function totalSupply() public view virtual override returns (uint256) {
    return super.totalSupply().getVariableDebtTokenBalance(POOL.getReserveNormalizedVariableDebt(_underlyingAsset));
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

  function getRevision() external pure virtual returns (uint256) {
    return DEBT_TOKEN_REVISION();
  }
}
