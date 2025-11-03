// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {DeraBorrowToken} from './DeraBorrowToken.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IInitializableDeraBorrowToken} from '../../interfaces/IInitializableDeraBorrowToken.sol';

interface IHederaTokenService {
  function associateToken(address account, address token) external returns (int64 responseCode);
  function isToken(address token) external returns (int64 responseCode, bool isToken);
}

/**
 * @title ConcreteDeraBorrowToken
 * @notice Concrete implementation of DeraBorrowToken for deployment
 */
contract ConcreteDeraBorrowToken is DeraBorrowToken {
  address constant HTS = address(0x167);
  int64 constant SUCCESS = 22;

  // Temporary debug events (remove after diagnosis)
  event DebugInitStart(address underlying, address pool);
  event DebugInitAfterAssociate(address underlying, bytes data);
  event DebugInitDone(address underlying);
  event DebugHTSCheck(bool success, bytes data);
  event DebugHTSIsTokenResult(int64 rc, bool isToken);
  event DebugHTSAssociateResult(bool success, bytes data);

  constructor(IPool pool) DeraBorrowToken(pool) {}

  function initialize(
    IPool initializingPool,
    address underlyingAsset,
    uint8 debtTokenDecimals,
    string calldata debtTokenName,
    string calldata debtTokenSymbol,
    bytes calldata params
  ) public override initializer {
    require(address(initializingPool) == address(POOL), 'POOL_INCONSISTENT');
    _setName(debtTokenName);
    _setSymbol(debtTokenSymbol);
    _setDecimals(debtTokenDecimals);
    _underlyingAsset = underlyingAsset;
    emit DebugInitStart(underlyingAsset, address(initializingPool));
    _associateHTS(underlyingAsset);
    emit DebugInitAfterAssociate(underlyingAsset, abi.encodePacked(underlyingAsset));
    emit Initialized(
      underlyingAsset,
      address(POOL),
      address(0), // incentivesController
      debtTokenDecimals,
      debtTokenName,
      debtTokenSymbol,
      params
    );
    emit DebugInitDone(underlyingAsset);
  }

  function _associateHTS(address asset) private {
    // Skip HTS association for native HBAR (address(0))
    if (asset == address(0)) {
      return;
    }
    
    (bool checkSuccess, bytes memory checkData) = HTS.call(
      abi.encodeWithSelector(IHederaTokenService.isToken.selector, asset)
    );
    emit DebugHTSCheck(checkSuccess, checkData);
    if (checkSuccess) {
      (int64 rc, bool isHTS) = abi.decode(checkData, (int64, bool));
      emit DebugHTSIsTokenResult(rc, isHTS);
      if (rc == SUCCESS && isHTS) {
        (bool success, bytes memory data) = HTS.call(
          abi.encodeWithSelector(IHederaTokenService.associateToken.selector, address(this), asset)
        );
        emit DebugHTSAssociateResult(success, data);
        if (success) {
          int64 responseCode = abi.decode(data, (int64));
          require(responseCode == SUCCESS, 'HTS_ASSOCIATE_FAILED');
        }
      }
    }
  }
}