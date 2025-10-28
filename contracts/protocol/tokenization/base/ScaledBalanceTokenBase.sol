// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {SafeCast} from "@openzeppelin/contracts/SafeCast.sol";
import {Errors} from '../../libraries/helpers/Errors.sol';
import {WadRayMath} from '../../libraries/math/WadRayMath.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {IScaledBalanceToken} from '../../../interfaces/IScaledBalanceToken.sol';
import {MintableIncentivizedERC20} from './MintableIncentivizedERC20.sol';

/**
 * @title ScaledBalanceTokenBase
 * @author DERA Protocol
 * @notice Base for scaled balance tokens with automatic interest accrual on Hedera
 * @dev Implements scaled balance logic where actual balance = scaledBalance × liquidityIndex
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: Scaled balances stored on-chain for gas efficiency
 * - HCS (Hedera Consensus Service): Mint/burn/transfer events logged to HCS
 * - Mirror Nodes: Balance history queryable via REST API
 * 
 * INTEGRATION:
 * - Scaled Balances: Users earn interest automatically without transactions
 * - Liquidity Index: Grows over time as interest accrues (compound interest)
 * - Gas Optimization: Only scaled balance stored, actual balance calculated on-demand
 * - Used by: DToken (interest-bearing deposit tokens)
 * 
 * FORMULA:
 * - actualBalance = scaledBalance × currentLiquidityIndex
 * - Interest accrues automatically as liquidityIndex increases
 * - No user action required to claim interest
 */
abstract contract ScaledBalanceTokenBase is MintableIncentivizedERC20, IScaledBalanceToken {
  using WadRayMath for uint256;
  using SafeCast for uint256;

  constructor(IPool pool, string memory name, string memory symbol, uint8 decimals) MintableIncentivizedERC20(pool, name, symbol, decimals) {}

  function scaledBalanceOf(address user) external view override returns (uint256) {
    return super.balanceOf(user);
  }

  function getScaledUserBalanceAndSupply(address user) external view override returns (uint256, uint256) {
    return (super.balanceOf(user), super.totalSupply());
  }

  function scaledTotalSupply() public view virtual override returns (uint256) {
    return super.totalSupply();
  }

  function getPreviousIndex(address user) external view virtual override returns (uint256) {
    return _userState[user].additionalData;
  }

  function _mintScaled(address caller, address onBehalfOf, uint256 amountScaled, uint256 index, function(uint256, uint256) internal pure returns (uint256) getTokenBalance) internal returns (bool) {
    require(amountScaled != 0, Errors.InvalidMintAmount());

    uint256 scaledBalance = super.balanceOf(onBehalfOf);
    uint256 nextBalance = getTokenBalance(amountScaled + scaledBalance, index);
    uint256 previousBalance = getTokenBalance(scaledBalance, _userState[onBehalfOf].additionalData);
    uint256 balanceIncrease = getTokenBalance(scaledBalance, index) - previousBalance;

    _userState[onBehalfOf].additionalData = index.toUint128();

    _mint(onBehalfOf, amountScaled.toUint120());

    uint256 amountToMint = nextBalance - previousBalance;
    emit Transfer(address(0), onBehalfOf, amountToMint);
    emit Mint(caller, onBehalfOf, amountToMint, balanceIncrease, index);

    return (scaledBalance == 0);
  }

  function _burnScaled(address user, address target, uint256 amountScaled, uint256 index, function(uint256, uint256) internal pure returns (uint256) getTokenBalance) internal returns (bool) {
    require(amountScaled != 0, Errors.InvalidBurnAmount());

    uint256 scaledBalance = super.balanceOf(user);
    uint256 nextBalance = getTokenBalance(scaledBalance - amountScaled, index);
    uint256 previousBalance = getTokenBalance(scaledBalance, _userState[user].additionalData);
    uint256 balanceIncrease = getTokenBalance(scaledBalance, index) - previousBalance;

    _userState[user].additionalData = index.toUint128();

    _burn(user, amountScaled.toUint120());

    if (nextBalance > previousBalance) {
      uint256 amountToMint = nextBalance - previousBalance;
      emit Transfer(address(0), user, amountToMint);
      emit Mint(user, user, amountToMint, balanceIncrease, index);
    } else {
      uint256 amountToBurn = previousBalance - nextBalance;
      emit Transfer(user, address(0), amountToBurn);
      emit Burn(user, target, amountToBurn, balanceIncrease, index);
    }

    return scaledBalance - amountScaled == 0;
  }
}
