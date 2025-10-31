// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title WHBARWrapper
 * @notice Wrapper to make WHBAR fully ERC20 compatible for Dera Protocol
 * @dev WHBAR on Hedera doesn't expose ERC20 metadata via JSON-RPC, this fixes it
 */
contract WHBARWrapper {
    address public constant WHBAR = 0x0000000000000000000000000000000000163A9a;
    
    function decimals() external pure returns (uint8) {
        return 8;
    }
    
    function name() external pure returns (string memory) {
        return "Wrapped HBAR";
    }
    
    function symbol() external pure returns (string memory) {
        return "WHBAR";
    }
    
    function totalSupply() external view returns (uint256) {
        return IERC20(WHBAR).totalSupply();
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return IERC20(WHBAR).balanceOf(account);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        return IERC20(WHBAR).transferFrom(msg.sender, to, amount);
    }
    
    function allowance(address owner, address spender) external view returns (uint256) {
        return IERC20(WHBAR).allowance(owner, spender);
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        return IERC20(WHBAR).approve(spender, amount);
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        return IERC20(WHBAR).transferFrom(from, to, amount);
    }
}
