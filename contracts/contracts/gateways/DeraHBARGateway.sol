// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IPool} from "../interfaces/IPool.sol";
import {IDeraSupplyToken} from "../interfaces/IDeraSupplyToken.sol";


contract DeraHBARGateway is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant HBAR_ADDRESS = 0x0000000000000000000000000000000000000000;

    event DepositHBAR(address indexed user, uint256 amount, uint16 referralCode);
    event WithdrawHBAR(address indexed user, uint256 amount, address indexed to);

    constructor() {}

    function depositHBAR(
        address lendingPool,
        address onBehalfOf,
        uint16 referralCode
    ) external payable nonReentrant {
        require(msg.value > 0, "Invalid HBAR amount");
        IPool(lendingPool).supply{value: msg.value}(HBAR_ADDRESS, msg.value, onBehalfOf, referralCode);
        emit DepositHBAR(msg.sender, msg.value, referralCode);
    }

    function withdrawHBAR(
        address lendingPool,
        uint256 amount,
        address to
    ) external nonReentrant {
        require(to != address(0), "INVALID_RECIPIENT");
        
        address supplyTokenAddress = IPool(lendingPool).getAssetSupplyToken(HBAR_ADDRESS);
        IDeraSupplyToken supplyToken = IDeraSupplyToken(supplyTokenAddress);
        
        uint256 userBalance = supplyToken.balanceOf(msg.sender);
        uint256 amountToWithdraw = amount == type(uint256).max ? userBalance : amount;

        require(amountToWithdraw > 0 && amountToWithdraw <= userBalance, "INVALID_AMOUNT");

        supplyToken.transferFrom(msg.sender, address(this), amountToWithdraw);
        uint256 withdrawn = IPool(lendingPool).withdraw(HBAR_ADDRESS, amountToWithdraw, address(this));
        
        (bool success, ) = to.call{value: withdrawn}("");
        require(success, "HBAR_TRANSFER_FAILED");

        emit WithdrawHBAR(msg.sender, withdrawn, to);
    }

    receive() external payable {}
}