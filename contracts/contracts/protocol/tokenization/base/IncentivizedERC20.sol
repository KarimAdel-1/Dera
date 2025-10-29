// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {WadRayMath} from '../../libraries/math/WadRayMath.sol';
import {Errors} from '../../libraries/helpers/Errors.sol';
import {IPoolAddressesProvider} from '../../../interfaces/IPoolAddressesProvider.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {IACLManager} from '../../../interfaces/IACLManager.sol';

/**
 * @title IncentivizedERC20
 * @author DERA Protocol
 * @notice Basic ERC20 implementation for dTokens and debt tokens on Hedera
 * @dev Base contract for interest-bearing tokens, uses IERC20 interface for compatibility
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: Token balances stored on-chain (not HTS)
 * - HCS (Hedera Consensus Service): Transfer events logged to HCS
 * - Mirror Nodes: Historical transfers queryable via REST API
 * 
 * INTEGRATION:
 * - IERC20 Interface: Kept for compatibility with existing DeFi tools
 * - State-Based: Balances in contract storage, not HTS native tokens
 * - Scaled Balances: Used by dTokens for automatic interest accrual
 * - Non-Transferable: Used by debt tokens (overridden in child contracts)
 * 
 * LIMITATIONS:
 * - Max balance per user: type(uint120).max (~1.33e36)
 * - Sufficient for most tokens with 18 decimals (~1.33e18 tokens)
 * - High-supply tokens should verify compatibility before deployment
 */
abstract contract IncentivizedERC20 is Context, IERC20Metadata {
  using WadRayMath for uint256;
  using SafeCast for uint256;

  error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);

  modifier onlyPoolAdmin() {
    IACLManager aclManager = IACLManager(_addressesProvider.getACLManager());
    require(aclManager.isPoolAdmin(_msgSender()), Errors.CallerNotPoolAdmin());
    _;
  }

  modifier onlyPool() {
    require(_msgSender() == address(POOL), Errors.CallerMustBePool());
    _;
  }

  struct UserState {
    uint120 balance;
    uint128 additionalData;
  }

  mapping(address => UserState) internal _userState;
  mapping(address => mapping(address => uint256)) private _allowances;

  uint256 internal _totalSupply;
  string private _name;
  string private _symbol;
  uint8 private _decimals;
  IPoolAddressesProvider internal immutable _addressesProvider;
  IPool public immutable POOL;

  constructor(IPool pool, string memory name_, string memory symbol_, uint8 decimals_) {
    _addressesProvider = pool.ADDRESSES_PROVIDER();
    _name = name_;
    _symbol = symbol_;
    _decimals = decimals_;
    POOL = pool;
  }

  function name() public view override returns (string memory) {
    return _name;
  }

  function symbol() external view override returns (string memory) {
    return _symbol;
  }

  function decimals() external view override returns (uint8) {
    return _decimals;
  }

  function totalSupply() public view virtual override returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) public view virtual override returns (uint256) {
    return _userState[account].balance;
  }

  function transfer(address recipient, uint256 amount) external virtual override returns (bool) {
    _transfer(_msgSender(), recipient, amount.toUint120());
    return true;
  }

  function allowance(address owner, address spender) external view virtual override returns (uint256) {
    return _allowances[owner][spender];
  }

  function approve(address spender, uint256 amount) external virtual override returns (bool) {
    _approve(_msgSender(), spender, amount);
    return true;
  }

  function transferFrom(address sender, address recipient, uint256 amount) external virtual override returns (bool) {
    uint120 castAmount = amount.toUint120();
    _spendAllowance(sender, _msgSender(), amount, castAmount);
    _transfer(sender, recipient, castAmount);
    return true;
  }

  function increaseAllowance(address spender, uint256 addedValue) external virtual returns (bool) {
    _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
    return true;
  }

  function decreaseAllowance(address spender, uint256 subtractedValue) external virtual returns (bool) {
    _approve(_msgSender(), spender, _allowances[_msgSender()][spender] - subtractedValue);
    return true;
  }

  /**
   * @notice Spend allowance with support for scaled balances
   * @param owner Token owner
   * @param spender Spender address
   * @param amount Requested amount (may differ from actual transfer for scaled tokens)
   * @param correctedAmount Actual amount transferred (after scaling/rounding)
   * @dev correctedAmount used by dTokens where balance scaling causes amount != actual transfer
   */
  function _spendAllowance(address owner, address spender, uint256 amount, uint256 correctedAmount) internal virtual {
    uint256 currentAllowance = _allowances[owner][spender];
    if (currentAllowance < amount) {
      revert ERC20InsufficientAllowance(spender, currentAllowance, amount);
    }

    uint256 consumption = currentAllowance >= correctedAmount ? correctedAmount : currentAllowance;
    _approve(owner, spender, currentAllowance - consumption);
  }

  function _transfer(address sender, address recipient, uint120 amount) internal virtual {
    uint120 oldSenderBalance = _userState[sender].balance;
    _userState[sender].balance = oldSenderBalance - amount;
    uint120 oldRecipientBalance = _userState[recipient].balance;
    _userState[recipient].balance = oldRecipientBalance + amount;
    
    emit Transfer(sender, recipient, amount);
  }

  function _approve(address owner, address spender, uint256 amount) internal virtual {
    _allowances[owner][spender] = amount;
    emit Approval(owner, spender, amount);
  }

  function _setName(string memory newName) internal {
    _name = newName;
  }

  function _setSymbol(string memory newSymbol) internal {
    _symbol = newSymbol;
  }

  function _setDecimals(uint8 newDecimals) internal {
    _decimals = newDecimals;
  }
}
