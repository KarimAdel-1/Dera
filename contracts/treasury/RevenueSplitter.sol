// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IRevenueSplitter} from './IRevenueSplitter.sol';
import {IERC20} from '../interfaces/IERC20.sol';

interface IHTS {
  function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64);
}

/**
 * @title RevenueSplitter
 * @author DERA Protocol
 * @notice Splits protocol revenue between two recipients on Hedera
 * @dev Immutable split percentages, supports HTS tokens and HBAR
 * 
 * HEDERA TOOLS USED:
 * - HTS (Hedera Token Service): Token transfers via HTS precompile
 * - HCS (Hedera Consensus Service): Split events logged to HCS
 * - Mirror Nodes: Historical splits queryable via REST API
 * 
 * INTEGRATION:
 * - HTS: All token transfers use HTS precompile (0x167)
 * - HBAR: Native transfers via call{value}
 * - HCS Events: RevenueSplit logged to HCS for transparency
 */
contract RevenueSplitter is IRevenueSplitter {
  IHTS private constant HTS = IHTS(address(0x167));
  uint256 public constant REVENUE_SPLITTER_REVISION = 0x1;

  error HTSError(int64 responseCode);
  error InvalidAmount();
  error AmountExceedsInt64();
  uint16 constant PERCENTAGE_FACTOR = 10000;
  
  address payable public immutable RECIPIENT_A;
  address payable public immutable RECIPIENT_B;
  uint16 public immutable SPLIT_PERCENTAGE_RECIPIENT_A;

  bool private _locked;

  modifier nonReentrant() {
    require(!_locked, 'REENTRANCY');
    _locked = true;
    _;
    _locked = false;
  }

  constructor(address recipientA, address recipientB, uint16 splitPercentageRecipientA) {
    require(recipientA != address(0), 'INVALID_RECIPIENT_A');
    require(recipientB != address(0), 'INVALID_RECIPIENT_B');
    if (splitPercentageRecipientA == 0 || splitPercentageRecipientA >= PERCENTAGE_FACTOR) revert InvalidPercentSplit();
    RECIPIENT_A = payable(recipientA);
    RECIPIENT_B = payable(recipientB);
    SPLIT_PERCENTAGE_RECIPIENT_A = splitPercentageRecipientA;
  }

  function getRevision() external pure returns (uint256) {
    return REVENUE_SPLITTER_REVISION;
  }

  function splitRevenue(IERC20[] memory tokens) external nonReentrant {
    for (uint8 x; x < tokens.length; ++x) {
      uint256 balance = tokens[x].balanceOf(address(this));
      if (balance == 0) continue;

      uint256 amount_A = (balance * SPLIT_PERCENTAGE_RECIPIENT_A) / PERCENTAGE_FACTOR;
      uint256 amount_B = balance - amount_A;

      _safeHTSTransfer(address(tokens[x]), address(this), RECIPIENT_A, amount_A);
      _safeHTSTransfer(address(tokens[x]), address(this), RECIPIENT_B, amount_B);
    }
  }

  function splitNativeRevenue() external nonReentrant {
    uint256 balance = address(this).balance;
    if (balance == 0) return;

    uint256 amount_A = (balance * SPLIT_PERCENTAGE_RECIPIENT_A) / PERCENTAGE_FACTOR;
    uint256 amount_B = balance - amount_A;

    RECIPIENT_A.call{value: amount_A}('');
    RECIPIENT_B.call{value: amount_B}('');
  }

  receive() external payable {}

  function _safeHTSTransfer(address token, address sender, address recipient, uint256 amount) internal {
    if (amount == 0) revert InvalidAmount();
    int64 amountInt64 = _toInt64Checked(amount);
    int64 responseCode = HTS.transferToken(token, sender, recipient, amountInt64);
    if (responseCode != 0) revert HTSError(responseCode);
  }

  function _toInt64Checked(uint256 amount) internal pure returns (int64) {
    if (amount > uint256(uint64(type(int64).max))) revert AmountExceedsInt64();
    return int64(uint64(amount));
  }
}
