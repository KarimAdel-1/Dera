// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LPCold
 * @dev LP Token for Tier 3 (90-Day Locked) deposits
 * @notice Represents shares in the cold liquidity pool
 * Features:
 * - Non-transferable between users (locked to depositor)
 * - Minting restricted to LendingPool contract
 * - Burning restricted to LendingPool contract
 * - 90-day minimum lock period
 */
contract LPCold is ERC20, Ownable {
    address public lendingPool;

    event LendingPoolSet(address indexed pool);

    /**
     * @dev Constructor initializes the token with name and symbol
     */
    constructor() ERC20("Dera LP Cold", "dLP-Cold") Ownable(msg.sender) {}

    /**
     * @dev Sets the lending pool address that can mint/burn tokens
     * @param _lendingPool Address of the LendingPool contract
     */
    function setLendingPool(address _lendingPool) external onlyOwner {
        require(_lendingPool != address(0), "Invalid lending pool address");
        lendingPool = _lendingPool;
        emit LendingPoolSet(_lendingPool);
    }

    /**
     * @dev Mints new LP tokens to a user
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == lendingPool, "Only lending pool can mint");
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, amount);
    }

    /**
     * @dev Burns LP tokens from a user
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external {
        require(msg.sender == lendingPool, "Only lending pool can burn");
        require(from != address(0), "Cannot burn from zero address");
        _burn(from, amount);
    }

    /**
     * @dev Override transfer to make tokens non-transferable between users
     * @notice Transfers are only allowed for minting and burning operations
     */
    function transfer(address, uint256) public pure override returns (bool) {
        revert("LP tokens are non-transferable");
    }

    /**
     * @dev Override transferFrom to make tokens non-transferable between users
     */
    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert("LP tokens are non-transferable");
    }

    /**
     * @dev Allow internal transfers for minting/burning
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        // Allow minting (from == address(0)) and burning (to == address(0))
        if (from != address(0) && to != address(0)) {
            revert("LP tokens are non-transferable");
        }
        super._update(from, to, value);
    }
}
