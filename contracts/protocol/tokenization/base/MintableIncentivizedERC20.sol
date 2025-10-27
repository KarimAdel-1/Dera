// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from '../../../interfaces/IPool.sol';
import {IncentivizedERC20} from './IncentivizedERC20.sol';

/**
 * @title MintableIncentivizedERC20
 * @author DERA Protocol
 * @notice Mintable/burnable ERC20 with incentives on Hedera
 * @dev Adds mint/burn functionality to IncentivizedERC20 base
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: Token supply managed on-chain
 * - HCS (Hedera Consensus Service): Mint/burn events logged to HCS
 * - Mirror Nodes: Supply changes queryable via REST API
 * 
 * INTEGRATION:
 * - ERC20 Compliance: Emits Transfer events for mint (from 0x0) and burn (to 0x0)
 * - Mirror Node Indexing: All supply changes indexed automatically
 * - Child Contracts: DToken uses for interest-bearing tokens
 */
abstract contract MintableIncentivizedERC20 is IncentivizedERC20 {
  constructor(IPool pool, string memory name, string memory symbol, uint8 decimals) IncentivizedERC20(pool, name, symbol, decimals) {}

  function _mint(address account, uint120 amount) internal virtual {
    uint256 oldTotalSupply = _totalSupply;
    _totalSupply = oldTotalSupply + amount;

    uint120 oldAccountBalance = _userState[account].balance;
    _userState[account].balance = oldAccountBalance + amount;

    emit Transfer(address(0), account, amount);
  }

  function _burn(address account, uint120 amount) internal virtual {
    uint256 oldTotalSupply = _totalSupply;
    _totalSupply = oldTotalSupply - amount;

    uint120 oldAccountBalance = _userState[account].balance;
    _userState[account].balance = oldAccountBalance - amount;

    emit Transfer(account, address(0), amount);
  }
}
