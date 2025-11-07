// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {DeraSupplyToken} from './DeraSupplyToken.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IInitializableDeraSupplyToken} from '../../interfaces/IInitializableDeraSupplyToken.sol';

interface IHederaTokenService {
  function associateToken(address account, address token) external returns (int64 responseCode);
  function isToken(address token) external returns (int64 responseCode, bool isToken);
}

/**
 * @title ConcreteDeraSupplyToken
 * @notice Concrete implementation of DeraSupplyToken for deployment
 */
contract ConcreteDeraSupplyToken is DeraSupplyToken {
  address constant HTS = address(0x167);
  int64 constant SUCCESS = 22;

  constructor(IPool pool, address treasury) DeraSupplyToken(pool, treasury) {}

  function initialize(
    IPool initializingPool,
    address underlyingAsset,
    uint8 supplyTokenDecimals,
    string calldata supplyTokenName,
    string calldata supplyTokenSymbol,
    bytes calldata params
  ) public override initializer {
    require(address(initializingPool) == address(POOL), 'POOL_INCONSISTENT');
    _setName(supplyTokenName);
    _setSymbol(supplyTokenSymbol);
    _setDecimals(supplyTokenDecimals);
    _underlyingAsset = underlyingAsset;
    _associateHTS(underlyingAsset);
    emit Initialized(
      underlyingAsset,
      address(POOL),
      TREASURY,
      address(0), // incentivesController
      supplyTokenDecimals,
      supplyTokenName,
      supplyTokenSymbol,
      params
    );
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