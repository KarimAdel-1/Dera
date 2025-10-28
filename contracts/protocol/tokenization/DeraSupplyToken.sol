// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {SafeCast} from '../../../dependencies/openzeppelin/contracts/SafeCast.sol';
import {ECDSA} from '../../../dependencies/openzeppelin/contracts/ECDSA.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {GPv2SafeERC20} from '../../../dependencies/gnosis/contracts/GPv2SafeERC20.sol';

interface IHTS {
  function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64);
}
import {VersionedInitializable} from '../../misc/dera-upgradeability/VersionedInitializable.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IDeraSupplyToken} from '../../interfaces/IDeraSupplyToken.sol';
import {IInitializableDeraSupplyToken} from '../../interfaces/IInitializableDeraSupplyToken.sol';
import {ScaledBalanceTokenBase} from './base/ScaledBalanceTokenBase.sol';
import {IncentivizedERC20} from './base/IncentivizedERC20.sol';
import {TokenMath} from '../libraries/helpers/TokenMath.sol';

/**
 * @title DeraSupplyToken (DST)
 * @author Dera Protocol
 * @notice Yield-bearing supply token on Hedera representing deposited assets with accrued interest
 *
 * HEDERA TOOLS USED:
 * - HTS (Hedera Token Service): Native HTS token with automatic interest accrual
 * - HCS (Hedera Consensus Service): All mint/burn/transfer events logged to HCS
 *
 * INTEGRATION:
 * - HTS: Token created via HTS, transfers use HTS precompile (0x167)
 * - Indexed balances: Balance grows automatically via liquidity index
 * - HCS Events: Mint, Burn, Transfer events logged to HCS for transparency
 * - No ERC20 permit on HTS - uses native HTS approval mechanism
 *
 * DERA PROTOCOL:
 * - Unique to Dera: Represents supply positions in lending pools
 * - Fully HTS-native implementation designed specifically for Hedera
 */
abstract contract DeraSupplyToken is VersionedInitializable, ScaledBalanceTokenBase, IDeraSupplyToken {
  using TokenMath for uint256;
  using SafeCast for uint256;
  using GPv2SafeERC20 for IERC20;

  IHTS private constant HTS = IHTS(address(0x167));

  bytes32 public constant PERMIT_TYPEHASH = keccak256('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)');
  bytes32 internal constant EIP712_DOMAIN = keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)');
  bytes public constant EIP712_REVISION = bytes('1');

  mapping(address => uint256) internal _nonces;
  bytes32 internal _domainSeparator;
  uint256 internal immutable _chainId;

  address public immutable TREASURY;
  address internal _underlyingAsset;

  constructor(IPool pool, address rewardsController, address treasury) ScaledBalanceTokenBase(pool, 'DST_IMPL', 'DST_IMPL', 0, rewardsController) {
    require(treasury != address(0), Errors.ZeroAddressNotValid());
    TREASURY = treasury;
    _chainId = block.chainid;
    _domainSeparator = _calculateDomainSeparator();
  }

  function initialize(IPool initializingPool, address underlyingAsset, uint8 supplyTokenDecimals, string calldata supplyTokenName, string calldata supplyTokenSymbol, bytes calldata params) public virtual;

  function mint(address caller, address onBehalfOf, uint256 scaledAmount, uint256 index) external virtual override onlyPool returns (bool) {
    return _mintScaled({
      caller: caller,
      onBehalfOf: onBehalfOf,
      amountScaled: scaledAmount,
      index: index,
      getTokenBalance: TokenMath.getDTokenBalance
    });
  }

  function burn(address from, address receiverOfUnderlying, uint256 amount, uint256 scaledAmount, uint256 index) external virtual override onlyPool returns (bool) {
    bool zeroBalanceAfterBurn = _burnScaled({
      user: from,
      target: receiverOfUnderlying,
      amountScaled: scaledAmount,
      index: index,
      getTokenBalance: TokenMath.getDTokenBalance
    });

    if (receiverOfUnderlying != address(this)) {
      // HTS native transfer
      _safeHTSTransfer(_underlyingAsset, address(this), receiverOfUnderlying, amount);
    }
    return zeroBalanceAfterBurn;
  }

  function mintToTreasury(uint256 scaledAmount, uint256 index) external virtual override onlyPool {
    if (scaledAmount == 0) return;
    _mintScaled({
      caller: address(POOL),
      onBehalfOf: TREASURY,
      amountScaled: scaledAmount,
      index: index,
      getTokenBalance: TokenMath.getDTokenBalance
    });
  }

  function transferOnLiquidation(address from, address to, uint256 amount, uint256 scaledAmount, uint256 index) external virtual override onlyPool {
    _transfer({
      sender: from,
      recipient: to,
      amount: amount,
      scaledAmount: scaledAmount.toUint120(),
      index: index
    });
  }

  function balanceOf(address user) public view virtual override(IncentivizedERC20, IERC20) returns (uint256) {
    return super.balanceOf(user).getDTokenBalance(POOL.getAssetNormalizedIncome(_underlyingAsset));
  }

  function totalSupply() public view virtual override(IncentivizedERC20, IERC20) returns (uint256) {
    return super.totalSupply().getDTokenBalance(POOL.getAssetNormalizedIncome(_underlyingAsset));
  }

  function RESERVE_TREASURY_ADDRESS() external view override returns (address) {
    return TREASURY;
  }

  function UNDERLYING_ASSET_ADDRESS() external view override returns (address) {
    return _underlyingAsset;
  }

  function transferUnderlyingTo(address target, uint256 amount) external virtual override onlyPool {
    // HTS native transfer
    _safeHTSTransfer(_underlyingAsset, address(this), target, amount);
  }

  function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external override {
    require(owner != address(0), Errors.ZeroAddressNotValid());
    require(block.timestamp <= deadline, Errors.InvalidExpiration());
    uint256 currentValidNonce = _nonces[owner];
    bytes32 digest = keccak256(abi.encodePacked('\x19\x01', DOMAIN_SEPARATOR(), keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, currentValidNonce, deadline))));
    require(owner == ECDSA.recover(digest, v, r, s), Errors.InvalidSignature());
    _nonces[owner] = currentValidNonce + 1;
    _approve(owner, spender, value);
  }

  function transferFrom(address sender, address recipient, uint256 amount) external virtual override(IERC20, IncentivizedERC20) returns (bool) {
    uint256 index = POOL.getAssetNormalizedIncome(_underlyingAsset);
    uint256 scaledBalanceOfSender = super.balanceOf(sender);
    _spendAllowance(sender, _msgSender(), amount, scaledBalanceOfSender.getDTokenBalance(index) - (scaledBalanceOfSender - amount.getDTokenTransferScaledAmount(index)).getDTokenBalance(index));
    _transfer(sender, recipient, amount.toUint120());
    return true;
  }

  function _transfer(address from, address to, uint120 amount) internal virtual override {
    uint256 index = POOL.getAssetNormalizedIncome(_underlyingAsset);
    uint256 scaledBalanceFromBefore = super.balanceOf(from);
    uint256 scaledBalanceToBefore = super.balanceOf(to);
    uint256 scaledAmount = uint256(amount).getDTokenTransferScaledAmount(index);

    _transfer({
      sender: from,
      recipient: to,
      amount: amount,
      scaledAmount: scaledAmount.toUint120(),
      index: index
    });

    POOL.finalizeTransfer({
      asset: _underlyingAsset,
      from: from,
      to: to,
      scaledAmount: scaledAmount,
      scaledBalanceFromBefore: scaledBalanceFromBefore,
      scaledBalanceToBefore: scaledBalanceToBefore
    });
  }

  function _transfer(address sender, address recipient, uint256 amount, uint120 scaledAmount, uint256 index) internal virtual {
    uint256 senderScaledBalance = super.balanceOf(sender);
    uint256 senderBalanceIncrease = senderScaledBalance.getDTokenBalance(index) - senderScaledBalance.getDTokenBalance(_userState[sender].additionalData);

    uint256 recipientScaledBalance = super.balanceOf(recipient);
    uint256 recipientBalanceIncrease = recipientScaledBalance.getDTokenBalance(index) - recipientScaledBalance.getDTokenBalance(_userState[recipient].additionalData);

    _userState[sender].additionalData = index.toUint128();
    _userState[recipient].additionalData = index.toUint128();

    super._transfer(sender, recipient, scaledAmount);

    if (senderBalanceIncrease > 0) {
      emit Transfer(address(0), sender, senderBalanceIncrease);
      emit Mint(_msgSender(), sender, senderBalanceIncrease, senderBalanceIncrease, index);
    }

    if (sender != recipient && recipientBalanceIncrease > 0) {
      emit Transfer(address(0), recipient, recipientBalanceIncrease);
      emit Mint(_msgSender(), recipient, recipientBalanceIncrease, recipientBalanceIncrease, index);
    }

    emit Transfer(sender, recipient, amount);
    emit BalanceTransfer(sender, recipient, scaledAmount, index);
  }

  function DOMAIN_SEPARATOR() public view override returns (bytes32) {
    if (block.chainid == _chainId) {
      return _domainSeparator;
    }
    return _calculateDomainSeparator();
  }

  function nonces(address owner) public view override returns (uint256) {
    return _nonces[owner];
  }

  function _calculateDomainSeparator() internal view returns (bytes32) {
    return keccak256(
      abi.encode(
        EIP712_DOMAIN,
        keccak256(bytes(name())),
        keccak256(EIP712_REVISION),
        block.chainid,
        address(this)
      )
    );
  }

  function rescueTokens(address token, address to, uint256 amount) external override onlyPoolAdmin {
    require(token != _underlyingAsset, Errors.UnderlyingCannotBeRescued());
    // HTS native transfer
    _safeHTSTransfer(token, address(this), to, amount);
  }

  function _safeHTSTransfer(address token, address from, address to, uint256 amount) internal {
    require(amount <= uint256(type(int64).max), "Amount exceeds int64");
    int64 result = HTS.transferToken(token, from, to, int64(uint64(amount)));
    require(result == 0, "HTS transfer failed");
  }

  function SUPPLY_TOKEN_REVISION() public pure virtual returns (uint256) {
    return 1;
  }

  function getRevision() external pure virtual returns (uint256) {
    return SUPPLY_TOKEN_REVISION();
  }
}
