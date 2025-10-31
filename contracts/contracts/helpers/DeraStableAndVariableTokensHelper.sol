// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
pragma experimental ABIEncoderV2;

import {ConcreteDeraBorrowToken} from "../protocol/tokenization/ConcreteDeraBorrowToken.sol";
import {IPool} from "../interfaces/IPool.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeraStableAndVariableTokensHelper
 * @notice Helper contract for batch deployment of debt tokens
 * @dev Based on Bonzo's StableAndVariableTokensHelper pattern but adapted for Dera Protocol
 */
contract DeraStableAndVariableTokensHelper is Ownable {
    address payable private pool;
    address private addressesProvider;
    
    event DeployedContracts(address stableToken, address variableToken);

    constructor(
        address payable _pool,
        address _addressesProvider
    ) {
        pool = _pool;
        addressesProvider = _addressesProvider;
    }

    /**
     * @notice Deploy debt token implementations in batch
     * @param tokens Array of underlying token addresses
     * @param symbols Array of token symbols
     */
    function initDeployment(
        address[] calldata tokens,
        string[] calldata symbols
    ) external onlyOwner {
        require(tokens.length == symbols.length, "Arrays not same length");
        require(pool != address(0), "Pool cannot be zero address");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            // For now, we only deploy variable debt tokens (stable debt disabled)
            // Deploy placeholder for stable debt (not used)
            ConcreteDeraBorrowToken stableToken = new ConcreteDeraBorrowToken(IPool(pool));
            
            // Deploy variable debt token
            ConcreteDeraBorrowToken variableToken = new ConcreteDeraBorrowToken(IPool(pool));
            
            emit DeployedContracts(address(stableToken), address(variableToken));
        }
    }

    /**
     * @notice Get the pool address
     */
    function getPool() external view returns (address) {
        return pool;
    }

    /**
     * @notice Get the addresses provider
     */
    function getAddressesProvider() external view returns (address) {
        return addressesProvider;
    }
}