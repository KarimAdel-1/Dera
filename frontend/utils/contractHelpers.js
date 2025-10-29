/**
 * Contract Helpers
 *
 * Utility functions for interacting with smart contracts
 * Includes helpers for amount formatting, approvals, and common operations
 */

import { ethers } from 'ethers';

/**
 * Format amount from human-readable to contract format (with decimals)
 * @param {string|number} amount - Human-readable amount (e.g., "100.5")
 * @param {number} decimals - Token decimals (e.g., 6 for USDC, 18 for most tokens)
 * @returns {string} Formatted amount as string
 */
export function formatAmountToContract(amount, decimals = 18) {
  try {
    return ethers.parseUnits(amount.toString(), decimals).toString();
  } catch (error) {
    console.error('Error formatting amount to contract:', error);
    throw new Error(`Invalid amount: ${amount}`);
  }
}

/**
 * Format amount from contract format to human-readable
 * @param {string|bigint} amount - Contract amount (with decimals)
 * @param {number} decimals - Token decimals
 * @param {number} displayDecimals - Number of decimals to display (default: 4)
 * @returns {string} Human-readable amount
 */
export function formatAmountFromContract(amount, decimals = 18, displayDecimals = 4) {
  try {
    const formatted = ethers.formatUnits(amount.toString(), decimals);
    return parseFloat(formatted).toFixed(displayDecimals);
  } catch (error) {
    console.error('Error formatting amount from contract:', error);
    return '0.0000';
  }
}

/**
 * Get max uint256 value (used for max approvals and withdrawals)
 * @returns {string} Max uint256 as string
 */
export function getMaxUint256() {
  return ethers.MaxUint256.toString();
}

/**
 * Check if address is valid Hedera address
 * @param {string} address - Address to validate (0.0.xxxxx or 0x format)
 * @returns {boolean} Validation result
 */
export function isValidHederaAddress(address) {
  if (!address) return false;

  // Check for Hedera format (0.0.xxxxx)
  const hederaFormat = /^0\.0\.\d+$/;
  if (hederaFormat.test(address)) {
    return true;
  }

  // Check for EVM format (0x...)
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Convert Hedera address (0.0.xxxxx) to EVM address (0x...)
 * Note: This is a simplified conversion. In production, you should use
 * Mirror Node API to get the actual EVM address.
 * @param {string} hederaAddress - Hedera address (0.0.xxxxx)
 * @returns {string} EVM address (0x...)
 */
export function hederaToEvmAddress(hederaAddress) {
  if (hederaAddress.startsWith('0x')) {
    return hederaAddress;
  }

  // Parse Hedera address (0.0.xxxxx)
  const parts = hederaAddress.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid Hedera address format');
  }

  const num = parseInt(parts[2], 10);

  // Create EVM address from Hedera address (simplified)
  // In production, query Mirror Node for actual EVM address
  return '0x' + num.toString(16).padStart(40, '0');
}

/**
 * Calculate health factor from collateral and debt
 * @param {number} totalCollateral - Total collateral in USD
 * @param {number} totalDebt - Total debt in USD
 * @param {number} liquidationThreshold - Liquidation threshold (e.g., 80 for 80%)
 * @returns {number} Health factor
 */
export function calculateHealthFactor(totalCollateral, totalDebt, liquidationThreshold) {
  if (totalDebt === 0) {
    return Infinity; // No debt = infinite health factor
  }

  const collateralAtThreshold = (totalCollateral * liquidationThreshold) / 100;
  return collateralAtThreshold / totalDebt;
}

/**
 * Calculate max borrowable amount
 * @param {number} totalCollateral - Total collateral in USD
 * @param {number} currentDebt - Current debt in USD
 * @param {number} ltv - Loan-to-value ratio (e.g., 75 for 75%)
 * @returns {number} Max borrowable amount in USD
 */
export function calculateMaxBorrow(totalCollateral, currentDebt, ltv) {
  const maxDebt = (totalCollateral * ltv) / 100;
  return Math.max(0, maxDebt - currentDebt);
}

/**
 * Calculate APY from rate per second
 * @param {string|number} ratePerSecond - Interest rate per second (in ray format, 27 decimals)
 * @returns {number} APY as percentage
 */
export function calculateAPYFromRate(ratePerSecond) {
  try {
    const rate = typeof ratePerSecond === 'string'
      ? parseFloat(ethers.formatUnits(ratePerSecond, 27))
      : ratePerSecond;

    // APY = (1 + rate)^seconds_per_year - 1
    const secondsPerYear = 365 * 24 * 60 * 60;
    const apy = (Math.pow(1 + rate, secondsPerYear) - 1) * 100;

    return apy;
  } catch (error) {
    console.error('Error calculating APY:', error);
    return 0;
  }
}

/**
 * Calculate utilization rate
 * @param {number} totalBorrows - Total borrowed amount
 * @param {number} totalSupply - Total supplied amount
 * @returns {number} Utilization rate as percentage
 */
export function calculateUtilizationRate(totalBorrows, totalSupply) {
  if (totalSupply === 0) return 0;
  return (totalBorrows / totalSupply) * 100;
}

/**
 * Format USD amount with currency symbol
 * @param {number} amount - Amount in USD
 * @param {number} decimals - Number of decimals to show
 * @returns {string} Formatted USD amount
 */
export function formatUSD(amount, decimals = 2) {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(decimals)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(decimals)}K`;
  }
  return `$${amount.toFixed(decimals)}`;
}

/**
 * Format percentage
 * @param {number} percentage - Percentage value
 * @param {number} decimals - Number of decimals to show
 * @returns {string} Formatted percentage
 */
export function formatPercentage(percentage, decimals = 2) {
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Get health factor color/status
 * @param {number} healthFactor - Health factor value
 * @returns {object} Color and status
 */
export function getHealthFactorStatus(healthFactor) {
  if (healthFactor === Infinity) {
    return { color: 'green', status: 'Safe', emoji: '✅' };
  }
  if (healthFactor >= 2) {
    return { color: 'green', status: 'Safe', emoji: '✅' };
  }
  if (healthFactor >= 1.5) {
    return { color: 'yellow', status: 'Moderate', emoji: '⚠️' };
  }
  if (healthFactor >= 1.0) {
    return { color: 'orange', status: 'Risky', emoji: '🔶' };
  }
  return { color: 'red', status: 'Liquidation Risk', emoji: '🚨' };
}

/**
 * Estimate gas for a transaction (Hedera uses HBAR, not gas, but useful for estimation)
 * @param {number} gasUnits - Gas units
 * @param {number} gasPrice - Gas price in tiny bars
 * @returns {object} Gas estimation
 */
export function estimateGasCost(gasUnits = 100000, gasPrice = 50) {
  const totalTinyBars = gasUnits * gasPrice;
  const hbar = totalTinyBars / 100000000; // Convert tiny bars to HBAR
  return {
    gasUnits,
    gasPrice,
    totalTinyBars,
    hbar: hbar.toFixed(4),
  };
}

/**
 * Wait for transaction confirmation
 * @param {object} transaction - Transaction object from ethers
 * @param {number} confirmations - Number of confirmations to wait for
 * @returns {Promise<object>} Transaction receipt
 */
export async function waitForTransaction(transaction, confirmations = 1) {
  try {
    console.log('Waiting for transaction confirmation:', transaction.hash);
    const receipt = await transaction.wait(confirmations);
    console.log('Transaction confirmed:', receipt.hash);
    return receipt;
  } catch (error) {
    console.error('Error waiting for transaction:', error);
    throw error;
  }
}

/**
 * Parse transaction error message
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export function parseTransactionError(error) {
  const errorMessage = error.message || error.toString();

  // Common error patterns
  if (errorMessage.includes('user rejected')) {
    return 'Transaction was rejected by user';
  }
  if (errorMessage.includes('insufficient funds')) {
    return 'Insufficient funds for transaction';
  }
  if (errorMessage.includes('gas required exceeds allowance')) {
    return 'Transaction would cost too much gas';
  }
  if (errorMessage.includes('nonce too low')) {
    return 'Transaction nonce error. Please try again.';
  }
  if (errorMessage.includes('execution reverted')) {
    // Try to extract revert reason
    const revertMatch = errorMessage.match(/execution reverted: (.+)/);
    if (revertMatch) {
      return `Transaction failed: ${revertMatch[1]}`;
    }
    return 'Transaction failed - execution reverted';
  }

  // Default error message
  return errorMessage.length > 100
    ? errorMessage.substring(0, 100) + '...'
    : errorMessage;
}

/**
 * Convert HBAR to USD (requires price feed)
 * @param {number} hbarAmount - Amount in HBAR
 * @param {number} hbarPrice - HBAR price in USD
 * @returns {number} Amount in USD
 */
export function hbarToUSD(hbarAmount, hbarPrice) {
  return hbarAmount * hbarPrice;
}

/**
 * Convert USD to HBAR
 * @param {number} usdAmount - Amount in USD
 * @param {number} hbarPrice - HBAR price in USD
 * @returns {number} Amount in HBAR
 */
export function usdToHBAR(usdAmount, hbarPrice) {
  if (hbarPrice === 0) return 0;
  return usdAmount / hbarPrice;
}

/**
 * Validate transaction parameters
 * @param {object} params - Transaction parameters
 * @returns {object} Validation result
 */
export function validateTransactionParams(params) {
  const errors = [];

  if (!params.asset || !isValidHederaAddress(params.asset)) {
    errors.push('Invalid asset address');
  }

  if (!params.amount || parseFloat(params.amount) <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (params.onBehalfOf && !isValidHederaAddress(params.onBehalfOf)) {
    errors.push('Invalid onBehalfOf address');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get token info from contract (name, symbol, decimals)
 * @param {string} tokenAddress - Token address
 * @param {object} provider - Ethers provider
 * @returns {Promise<object>} Token info
 */
export async function getTokenInfo(tokenAddress, provider) {
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
      ],
      provider
    );

    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ]);

    return { name, symbol, decimals };
  } catch (error) {
    console.error('Error getting token info:', error);
    return { name: 'Unknown', symbol: 'UNK', decimals: 18 };
  }
}

export default {
  formatAmountToContract,
  formatAmountFromContract,
  getMaxUint256,
  isValidHederaAddress,
  hederaToEvmAddress,
  calculateHealthFactor,
  calculateMaxBorrow,
  calculateAPYFromRate,
  calculateUtilizationRate,
  formatUSD,
  formatPercentage,
  getHealthFactorStatus,
  estimateGasCost,
  waitForTransaction,
  parseTransactionError,
  hbarToUSD,
  usdToHBAR,
  validateTransactionParams,
  getTokenInfo,
};
