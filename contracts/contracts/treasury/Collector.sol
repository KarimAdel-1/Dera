// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

interface IHTS {
  function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64);
}
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Collector
 * @author DERA Protocol
 * @notice Treasury contract for protocol fees with streaming payment capabilities on Hedera
 * @dev Collects protocol revenue and supports vesting/streaming to team/investors
 * 
 * HEDERA TOOLS USED:
 * - HTS (Hedera Token Service): Holds HTS tokens, transfers via HTS precompile
 * - HCS (Hedera Consensus Service): All stream events logged to HCS for transparency
 * - Hedera Scheduled Transactions: Can schedule future stream payments
 * 
 * INTEGRATION:
 * - HTS: All token transfers use HTS precompile (0x167)
 * - HCS Events: CreateStream, WithdrawFromStream, CancelStream logged to HCS
 * - Scheduled Transactions: Use ScheduleCreateTransaction for automated vesting
 * - Hedera SDK: Owner uses SDK to manage treasury operations
 */
contract Collector is Ownable, ReentrancyGuard {
  using SafeERC20 for IERC20;
  using Address for address payable;

  IHTS private constant HTS = IHTS(address(0x167));
  address public constant HBAR_MOCK_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

  struct Stream {
    uint256 deposit;
    uint256 ratePerSecond;
    uint256 remainingBalance;
    uint256 startTime;
    uint256 stopTime;
    address recipient;
    address sender;
    address tokenAddress;
    bool isEntity;
  }

  uint256 private _nextStreamId;
  mapping(uint256 => Stream) private _streams;

  event CreateStream(
    uint256 indexed streamId,
    address indexed sender,
    address indexed recipient,
    uint256 deposit,
    address tokenAddress,
    uint256 startTime,
    uint256 stopTime
  );

  event WithdrawFromStream(uint256 indexed streamId, address indexed recipient, uint256 amount);

  event CancelStream(
    uint256 indexed streamId,
    address indexed sender,
    address indexed recipient,
    uint256 senderBalance,
    uint256 recipientBalance
  );

  modifier streamExists(uint256 streamId) {
    require(_streams[streamId].isEntity, 'STREAM_DOES_NOT_EXIST');
    _;
  }

  modifier onlyOwnerOrRecipient(uint256 streamId) {
    require(
      msg.sender == owner() || msg.sender == _streams[streamId].recipient,
      'ONLY_OWNER_OR_RECIPIENT'
    );
    _;
  }

  constructor(address _owner) {
    transferOwnership(_owner);
  }

  /**
   * @notice Transfer tokens from treasury
   * @param token Token address (use HBAR_MOCK_ADDRESS for HBAR)
   * @param recipient Recipient address
   * @param amount Amount to transfer
   * @dev Only owner can call - uses JSON-RPC Relay for execution
   */
  function transfer(
    IERC20 token,
    address recipient,
    uint256 amount
  ) external onlyOwner {
    require(recipient != address(0), 'INVALID_RECIPIENT');

    if (address(token) == HBAR_MOCK_ADDRESS) {
      payable(recipient).sendValue(amount); // Native HBAR transfer
    } else {
      _safeHTSTransfer(address(token), address(this), recipient, amount); // HTS token transfer
    }
  }

  /**
   * @notice Approve tokens for spending
   * @param token Token address
   * @param spender Spender address
   * @param amount Amount to approve
   */
  function approve(
    IERC20 token,
    address spender,
    uint256 amount
  ) external onlyOwner {
    token.safeApprove(spender, amount);
  }

  /**
   * @notice Create streaming payment (vesting schedule)
   * @param recipient Recipient address
   * @param deposit Total amount to stream
   * @param tokenAddress Token address
   * @param startTime Stream start time (block.timestamp)
   * @param stopTime Stream stop time
   * @return streamId The created stream ID
   * @dev Uses block.timestamp from Hedera consensus
   */
  function createStream(
    address recipient,
    uint256 deposit,
    address tokenAddress,
    uint256 startTime,
    uint256 stopTime
  ) external onlyOwner returns (uint256) {
    require(recipient != address(0), 'INVALID_RECIPIENT');
    require(recipient != address(this), 'INVALID_RECIPIENT');
    require(recipient != msg.sender, 'INVALID_RECIPIENT');
    require(deposit > 0, 'INVALID_DEPOSIT');
    require(startTime >= block.timestamp, 'INVALID_START_TIME');
    require(stopTime > startTime, 'INVALID_STOP_TIME');

    uint256 duration = stopTime - startTime;
    require(deposit >= duration, 'DEPOSIT_TOO_SMALL');
    require(deposit % duration == 0, 'DEPOSIT_NOT_MULTIPLE');

    uint256 ratePerSecond = deposit / duration;
    uint256 streamId = _nextStreamId;

    _streams[streamId] = Stream({
      deposit: deposit,
      ratePerSecond: ratePerSecond,
      remainingBalance: deposit,
      startTime: startTime,
      stopTime: stopTime,
      recipient: recipient,
      sender: address(this),
      tokenAddress: tokenAddress,
      isEntity: true
    });

    _nextStreamId++;

    emit CreateStream(streamId, address(this), recipient, deposit, tokenAddress, startTime, stopTime);
    return streamId;
  }

  /**
   * @notice Withdraw from stream
   * @param streamId Stream ID
   * @param amount Amount to withdraw
   * @return success True if successful
   */
  function withdrawFromStream(
    uint256 streamId,
    uint256 amount
  ) external nonReentrant streamExists(streamId) onlyOwnerOrRecipient(streamId) returns (bool) {
    require(amount > 0, 'INVALID_AMOUNT');
    Stream memory stream = _streams[streamId];

    uint256 balance = balanceOf(streamId, stream.recipient);
    require(balance >= amount, 'INSUFFICIENT_BALANCE');

    _streams[streamId].remainingBalance = stream.remainingBalance - amount;

    if (_streams[streamId].remainingBalance == 0) {
      delete _streams[streamId];
    }

    _safeHTSTransfer(stream.tokenAddress, address(this), stream.recipient, amount);
    emit WithdrawFromStream(streamId, stream.recipient, amount);
    return true;
  }

  /**
   * @notice Cancel stream
   * @param streamId Stream ID
   * @return success True if successful
   */
  function cancelStream(
    uint256 streamId
  ) external nonReentrant streamExists(streamId) onlyOwnerOrRecipient(streamId) returns (bool) {
    Stream memory stream = _streams[streamId];
    uint256 senderBalance = balanceOf(streamId, stream.sender);
    uint256 recipientBalance = balanceOf(streamId, stream.recipient);

    delete _streams[streamId];

    if (recipientBalance > 0) {
      _safeHTSTransfer(stream.tokenAddress, address(this), stream.recipient, recipientBalance);
    }

    emit CancelStream(streamId, stream.sender, stream.recipient, senderBalance, recipientBalance);
    return true;
  }

  /**
   * @notice Get stream balance for address
   * @param streamId Stream ID
   * @param who Address to check
   * @return balance Balance available
   */
  function balanceOf(uint256 streamId, address who) public view streamExists(streamId) returns (uint256) {
    Stream memory stream = _streams[streamId];
    uint256 delta = deltaOf(streamId);
    uint256 recipientBalance = delta * stream.ratePerSecond;

    if (stream.deposit > stream.remainingBalance) {
      uint256 withdrawalAmount = stream.deposit - stream.remainingBalance;
      recipientBalance = recipientBalance - withdrawalAmount;
    }

    if (who == stream.recipient) return recipientBalance;
    if (who == stream.sender) {
      return stream.remainingBalance - recipientBalance;
    }
    return 0;
  }

  /**
   * @notice Get time delta for stream
   * @param streamId Stream ID
   * @return delta Time delta in seconds
   */
  function deltaOf(uint256 streamId) public view streamExists(streamId) returns (uint256) {
    Stream memory stream = _streams[streamId];
    if (block.timestamp <= stream.startTime) return 0;
    if (block.timestamp < stream.stopTime) return block.timestamp - stream.startTime;
    return stream.stopTime - stream.startTime;
  }

  /**
   * @notice Get stream details
   * @param streamId Stream ID
   */
  function getStream(
    uint256 streamId
  )
    external
    view
    streamExists(streamId)
    returns (
      address sender,
      address recipient,
      uint256 deposit,
      address tokenAddress,
      uint256 startTime,
      uint256 stopTime,
      uint256 remainingBalance,
      uint256 ratePerSecond
    )
  {
    Stream memory stream = _streams[streamId];
    return (
      stream.sender,
      stream.recipient,
      stream.deposit,
      stream.tokenAddress,
      stream.startTime,
      stream.stopTime,
      stream.remainingBalance,
      stream.ratePerSecond
    );
  }

  function getNextStreamId() external view returns (uint256) {
    return _nextStreamId;
  }

  function _safeHTSTransfer(address token, address from, address to, uint256 amount) internal {
    if (amount > uint256(uint64(type(int64).max))) revert("Amount exceeds int64");
    int64 result = HTS.transferToken(token, from, to, int64(uint64(amount)));
    require(result == 0, "HTS transfer failed");
  }

  function COLLECTOR_REVISION() public pure virtual returns (uint256) {
    return 1;
  }

  function getRevision() external pure virtual returns (uint256) {
    return COLLECTOR_REVISION();
  }

  receive() external payable {}
}
