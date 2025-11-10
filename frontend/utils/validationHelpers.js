/**
 * Validation Helper Functions
 *
 * Centralized validation utilities for the Dera Protocol frontend
 */

/**
 * Sanitize and validate numeric input
 * @param {string} value - The input value to sanitize
 * @returns {object} { isValid: boolean, value: string, error: string }
 */
export function sanitizeNumericInput(value) {
  if (!value || value.trim() === '') {
    return { isValid: false, value: '', error: 'Amount is required' };
  }

  // Remove any non-numeric characters except decimal point
  const sanitized = value.replace(/[^0-9.]/g, '');

  // Check for multiple decimal points
  if ((sanitized.match(/\./g) || []).length > 1) {
    return { isValid: false, value: sanitized, error: 'Invalid number format' };
  }

  // Check if it's a valid number
  const numValue = parseFloat(sanitized);
  if (isNaN(numValue)) {
    return { isValid: false, value: sanitized, error: 'Please enter a valid number' };
  }

  // Check for negative numbers
  if (numValue < 0) {
    return { isValid: false, value: sanitized, error: 'Amount cannot be negative' };
  }

  // Check for zero
  if (numValue === 0) {
    return { isValid: false, value: sanitized, error: 'Amount must be greater than zero' };
  }

  // Check for unreasonably large numbers (potential overflow)
  if (numValue > Number.MAX_SAFE_INTEGER) {
    return { isValid: false, value: sanitized, error: 'Amount too large' };
  }

  return { isValid: true, value: sanitized, error: '' };
}

/**
 * Validate supply amount
 * @param {string} amount - Amount to supply
 * @param {number} walletBalance - Available wallet balance
 * @param {string} assetSymbol - Asset symbol for error messages
 * @returns {object} { isValid: boolean, error: string }
 */
export function validateSupplyAmount(amount, walletBalance, assetSymbol) {
  const sanitized = sanitizeNumericInput(amount);
  if (!sanitized.isValid) {
    return { isValid: false, error: sanitized.error };
  }

  const amountNum = parseFloat(sanitized.value);

  if (amountNum > walletBalance) {
    return {
      isValid: false,
      error: `Insufficient ${assetSymbol} balance. Available: ${walletBalance.toFixed(8)}`
    };
  }

  // For native HBAR, reserve 1 HBAR for gas fees
  if (assetSymbol === 'HBAR' && amountNum > walletBalance - 1) {
    return {
      isValid: false,
      error: `Please reserve at least 1 HBAR for gas fees. Maximum you can supply: ${(walletBalance - 1).toFixed(2)} HBAR`
    };
  }

  return { isValid: true, error: '' };
}

/**
 * Validate borrow amount
 * @param {string} amount - Amount to borrow
 * @param {number} availableToBorrowUSD - Available borrowing capacity in USD
 * @param {number} assetPrice - Price of the asset in USD
 * @param {string} assetSymbol - Asset symbol for error messages
 * @returns {object} { isValid: boolean, error: string, maxBorrowTokens: number }
 */
export function validateBorrowAmount(amount, availableToBorrowUSD, assetPrice, assetSymbol) {
  const sanitized = sanitizeNumericInput(amount);
  if (!sanitized.isValid) {
    return { isValid: false, error: sanitized.error, maxBorrowTokens: 0 };
  }

  const amountNum = parseFloat(sanitized.value);
  const borrowValueUSD = amountNum * assetPrice;
  const maxBorrowTokens = availableToBorrowUSD / assetPrice;

  if (borrowValueUSD > availableToBorrowUSD) {
    return {
      isValid: false,
      error: `Borrow amount ($${borrowValueUSD.toFixed(2)}) exceeds available capacity ($${availableToBorrowUSD.toFixed(2)}). Maximum: ${maxBorrowTokens.toFixed(2)} ${assetSymbol}`,
      maxBorrowTokens
    };
  }

  return { isValid: true, error: '', maxBorrowTokens };
}

/**
 * Validate withdraw amount
 * @param {string} amount - Amount to withdraw
 * @param {number} suppliedBalance - Currently supplied balance
 * @param {string} assetSymbol - Asset symbol for error messages
 * @param {boolean} hasActiveBorrows - Whether user has active borrows
 * @returns {object} { isValid: boolean, error: string }
 */
export function validateWithdrawAmount(amount, suppliedBalance, assetSymbol, hasActiveBorrows = false) {
  // Allow 'max' for full withdrawal
  if (amount === 'max') {
    if (hasActiveBorrows) {
      return {
        isValid: false,
        error: 'Cannot withdraw all collateral while having active borrows'
      };
    }
    return { isValid: true, error: '' };
  }

  const sanitized = sanitizeNumericInput(amount);
  if (!sanitized.isValid) {
    return { isValid: false, error: sanitized.error };
  }

  const amountNum = parseFloat(sanitized.value);

  if (amountNum > suppliedBalance) {
    return {
      isValid: false,
      error: `Insufficient supplied balance. Available: ${suppliedBalance.toFixed(8)} ${assetSymbol}`
    };
  }

  return { isValid: true, error: '' };
}

/**
 * Validate repay amount
 * @param {string} amount - Amount to repay
 * @param {number} borrowedBalance - Currently borrowed balance
 * @param {number} walletBalance - Available wallet balance
 * @param {string} assetSymbol - Asset symbol for error messages
 * @returns {object} { isValid: boolean, error: string }
 */
export function validateRepayAmount(amount, borrowedBalance, walletBalance, assetSymbol) {
  // Allow 'max' for full repayment
  if (amount === 'max') {
    if (borrowedBalance === 0) {
      return {
        isValid: false,
        error: `No ${assetSymbol} debt to repay`
      };
    }
    return { isValid: true, error: '' };
  }

  const sanitized = sanitizeNumericInput(amount);
  if (!sanitized.isValid) {
    return { isValid: false, error: sanitized.error };
  }

  const amountNum = parseFloat(sanitized.value);

  if (borrowedBalance === 0) {
    return {
      isValid: false,
      error: `No ${assetSymbol} debt to repay`
    };
  }

  if (amountNum > borrowedBalance) {
    return {
      isValid: false,
      error: `Repay amount exceeds debt. Outstanding: ${borrowedBalance.toFixed(8)} ${assetSymbol}`
    };
  }

  if (amountNum > walletBalance) {
    return {
      isValid: false,
      error: `Insufficient ${assetSymbol} balance. Available: ${walletBalance.toFixed(8)}`
    };
  }

  return { isValid: true, error: '' };
}

/**
 * Calculate maximum borrow amount in tokens
 * @param {number} availableToBorrowUSD - Available borrowing capacity in USD
 * @param {number} assetPrice - Price of the asset in USD
 * @returns {number} Maximum amount of tokens that can be borrowed
 */
export function calculateMaxBorrow(availableToBorrowUSD, assetPrice) {
  if (assetPrice === 0) return 0;
  return availableToBorrowUSD / assetPrice;
}

/**
 * Calculate maximum supply amount (reserves gas for HBAR)
 * @param {number} walletBalance - Wallet balance
 * @param {string} assetSymbol - Asset symbol
 * @returns {number} Maximum amount that can be supplied
 */
export function calculateMaxSupply(walletBalance, assetSymbol) {
  if (assetSymbol === 'HBAR') {
    // Reserve 1 HBAR for gas fees
    return Math.max(0, walletBalance - 1);
  }
  return walletBalance;
}

/**
 * Format number safely without scientific notation
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export function formatNumberSafe(value, decimals = 8) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }

  // Avoid scientific notation
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Check if health factor would be safe after an action
 * @param {number} currentCollateralUSD - Current collateral in USD
 * @param {number} currentDebtUSD - Current debt in USD
 * @param {number} collateralChange - Change in collateral (negative for decrease)
 * @param {number} debtChange - Change in debt (positive for increase)
 * @param {number} liquidationThreshold - Liquidation threshold (e.g., 80 for 80%)
 * @returns {object} { isSafe: boolean, newHealthFactor: number, error: string }
 */
export function checkHealthFactorSafety(
  currentCollateralUSD,
  currentDebtUSD,
  collateralChange,
  debtChange,
  liquidationThreshold
) {
  const newCollateralUSD = currentCollateralUSD + collateralChange;
  const newDebtUSD = currentDebtUSD + debtChange;

  // If no debt, health factor is infinite
  if (newDebtUSD === 0) {
    return { isSafe: true, newHealthFactor: Infinity, error: '' };
  }

  // Calculate new health factor
  // HF = (collateral * liquidationThreshold) / debt
  const newHealthFactor = (newCollateralUSD * (liquidationThreshold / 100)) / newDebtUSD;

  // Require minimum health factor of 1.5 for safety buffer
  const MIN_SAFE_HEALTH_FACTOR = 1.5;

  if (newHealthFactor < MIN_SAFE_HEALTH_FACTOR) {
    return {
      isSafe: false,
      newHealthFactor,
      error: `This action would reduce your health factor to ${newHealthFactor.toFixed(2)}, which is below the safe threshold of ${MIN_SAFE_HEALTH_FACTOR}. Risk of liquidation!`
    };
  }

  return { isSafe: true, newHealthFactor, error: '' };
}
