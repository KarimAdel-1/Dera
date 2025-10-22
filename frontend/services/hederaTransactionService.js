import {
  TransferTransaction,
  Hbar,
  AccountId,
  TransactionId
} from '@hashgraph/sdk';
import { hashpackService } from './hashpackService';

/**
 * Hedera Transaction Service
 * Handles actual HBAR transfers and smart contract interactions
 */
class HederaTransactionService {
  constructor() {
    this.network = 'testnet';
    // Platform treasury account (where deposits go)
    // TODO: Replace with actual deployed contract address
    this.platformTreasuryId = process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || '0.0.7094264';
    console.log('💎 HederaTransactionService initialized');
    console.log('Platform Treasury:', this.platformTreasuryId);
  }

  /**
   * Create and execute a deposit transaction
   * Transfers HBAR from user to platform treasury
   */
  async createDeposit(walletAccountId, amountHbar) {
    try {
      console.log('💰 Creating deposit transaction:', { walletAccountId, amountHbar });

      // Verify HashConnect is connected
      if (!hashpackService.isConnected()) {
        throw new Error('Wallet not connected. Please connect your HashPack wallet first.');
      }

      // Create transfer transaction
      const transaction = new TransferTransaction()
        .addHbarTransfer(walletAccountId, new Hbar(-amountHbar)) // User sends
        .addHbarTransfer(this.platformTreasuryId, new Hbar(amountHbar)) // Platform receives
        .setTransactionMemo(`Dera Deposit: ${amountHbar} HBAR`)
        .setTransactionId(TransactionId.generate(walletAccountId));

      console.log('📝 Transaction created, freezing...');

      // Freeze the transaction (required before signing)
      const frozenTx = await transaction.freeze();

      console.log('✍️ Requesting signature from HashPack...');

      // Send to HashPack for signing and execution
      const response = await hashpackService.sendTransaction(walletAccountId, frozenTx);

      console.log('📨 Transaction response:', response);

      if (!response.success) {
        throw new Error(response.error || 'Transaction failed');
      }

      // Get transaction ID from response
      const txId = response.response?.transactionId || response.transactionId;

      console.log('✅ Deposit transaction successful!');
      console.log('Transaction ID:', txId);

      return {
        success: true,
        transactionId: txId,
        amount: amountHbar,
        from: walletAccountId,
        to: this.platformTreasuryId,
      };
    } catch (error) {
      console.error('❌ Deposit transaction failed:', error);

      // User rejected transaction
      if (error.message?.includes('user rejected') || error.message?.includes('denied')) {
        throw new Error('Transaction cancelled by user');
      }

      throw new Error(`Deposit failed: ${error.message}`);
    }
  }

  /**
   * Create and execute a withdrawal transaction
   * Transfers HBAR from platform treasury to user
   * Note: This requires the platform to sign, so it should be done via backend
   */
  async createWithdrawal(walletAccountId, amountHbar) {
    // TODO: This should be done via backend with service account signing
    // For now, throw an error to indicate backend integration needed
    throw new Error(
      'Withdrawals must be processed through the backend service. Please contact support.'
    );
  }

  /**
   * Create and execute a borrow transaction
   * 1. User sends collateral HBAR to platform
   * 2. Platform sends borrowed HBAR to user (via backend)
   */
  async createBorrowTransaction(walletAccountId, collateralAmountHbar, borrowAmountHbar) {
    try {
      console.log('💵 Creating borrow transaction:', {
        walletAccountId,
        collateralAmountHbar,
        borrowAmountHbar,
      });

      // Verify HashConnect is connected
      if (!hashpackService.isConnected()) {
        throw new Error('Wallet not connected. Please connect your HashPack wallet first.');
      }

      // Step 1: User sends collateral to platform
      console.log('🔒 Sending collateral to platform...');

      const collateralTx = new TransferTransaction()
        .addHbarTransfer(walletAccountId, new Hbar(-collateralAmountHbar))
        .addHbarTransfer(this.platformTreasuryId, new Hbar(collateralAmountHbar))
        .setTransactionMemo(`Dera Collateral: ${collateralAmountHbar} HBAR for loan`)
        .setTransactionId(TransactionId.generate(walletAccountId));

      console.log('📝 Freezing collateral transaction...');
      const frozenCollateralTx = await collateralTx.freeze();

      console.log('✍️ Requesting signature from HashPack...');
      const collateralResponse = await hashpackService.sendTransaction(
        walletAccountId,
        frozenCollateralTx
      );

      console.log('📨 Collateral transaction response:', collateralResponse);

      if (!collateralResponse.success) {
        throw new Error(collateralResponse.error || 'Collateral transaction failed');
      }

      const collateralTxId = collateralResponse.response?.transactionId || collateralResponse.transactionId;

      console.log('✅ Collateral sent successfully!');
      console.log('Collateral Transaction ID:', collateralTxId);

      // Step 2: Platform sends borrowed HBAR (should be done via backend)
      // For now, we'll return success with a note
      console.log('📝 Loan recorded. Borrowed HBAR will be transferred by platform.');

      return {
        success: true,
        collateralTransactionId: collateralTxId,
        collateralAmount: collateralAmountHbar,
        borrowAmount: borrowAmountHbar,
        from: walletAccountId,
        to: this.platformTreasuryId,
        note: 'Collateral locked. Borrowed HBAR will be transferred to your wallet shortly.',
      };
    } catch (error) {
      console.error('❌ Borrow transaction failed:', error);

      if (error.message?.includes('user rejected') || error.message?.includes('denied')) {
        throw new Error('Transaction cancelled by user');
      }

      throw new Error(`Borrow failed: ${error.message}`);
    }
  }

  /**
   * Create and execute a repayment transaction
   * User sends borrowed HBAR back to platform
   */
  async createRepayment(walletAccountId, repayAmountHbar, loanId) {
    try {
      console.log('💸 Creating repayment transaction:', {
        walletAccountId,
        repayAmountHbar,
        loanId,
      });

      // Verify HashConnect is connected
      if (!hashpackService.isConnected()) {
        throw new Error('Wallet not connected. Please connect your HashPack wallet first.');
      }

      const repaymentTx = new TransferTransaction()
        .addHbarTransfer(walletAccountId, new Hbar(-repayAmountHbar))
        .addHbarTransfer(this.platformTreasuryId, new Hbar(repayAmountHbar))
        .setTransactionMemo(`Dera Repayment: Loan ${loanId.substring(0, 8)}`)
        .setTransactionId(TransactionId.generate(walletAccountId));

      console.log('📝 Freezing repayment transaction...');
      const frozenTx = await repaymentTx.freeze();

      console.log('✍️ Requesting signature from HashPack...');
      const response = await hashpackService.sendTransaction(walletAccountId, frozenTx);

      if (!response.success) {
        throw new Error(response.error || 'Repayment transaction failed');
      }

      const txId = response.response?.transactionId || response.transactionId;

      console.log('✅ Repayment successful!');
      console.log('Transaction ID:', txId);

      return {
        success: true,
        transactionId: txId,
        amount: repayAmountHbar,
        loanId: loanId,
        from: walletAccountId,
        to: this.platformTreasuryId,
      };
    } catch (error) {
      console.error('❌ Repayment transaction failed:', error);

      if (error.message?.includes('user rejected') || error.message?.includes('denied')) {
        throw new Error('Transaction cancelled by user');
      }

      throw new Error(`Repayment failed: ${error.message}`);
    }
  }

  /**
   * Add collateral to existing loan
   */
  async addCollateral(walletAccountId, collateralAmountHbar, loanId) {
    try {
      console.log('🔒 Adding collateral:', {
        walletAccountId,
        collateralAmountHbar,
        loanId,
      });

      if (!hashpackService.isConnected()) {
        throw new Error('Wallet not connected. Please connect your HashPack wallet first.');
      }

      const collateralTx = new TransferTransaction()
        .addHbarTransfer(walletAccountId, new Hbar(-collateralAmountHbar))
        .addHbarTransfer(this.platformTreasuryId, new Hbar(collateralAmountHbar))
        .setTransactionMemo(`Dera Add Collateral: Loan ${loanId.substring(0, 8)}`)
        .setTransactionId(TransactionId.generate(walletAccountId));

      const frozenTx = await collateralTx.freeze();
      const response = await hashpackService.sendTransaction(walletAccountId, frozenTx);

      if (!response.success) {
        throw new Error(response.error || 'Add collateral transaction failed');
      }

      const txId = response.response?.transactionId || response.transactionId;

      console.log('✅ Collateral added successfully!');
      console.log('Transaction ID:', txId);

      return {
        success: true,
        transactionId: txId,
        amount: collateralAmountHbar,
        loanId: loanId,
        from: walletAccountId,
        to: this.platformTreasuryId,
      };
    } catch (error) {
      console.error('❌ Add collateral failed:', error);

      if (error.message?.includes('user rejected') || error.message?.includes('denied')) {
        throw new Error('Transaction cancelled by user');
      }

      throw new Error(`Add collateral failed: ${error.message}`);
    }
  }

  /**
   * Get transaction status from Hedera network
   */
  async getTransactionStatus(transactionId) {
    try {
      // Query mirror node for transaction status
      const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/transactions/${transactionId}`;

      const response = await fetch(mirrorNodeUrl);
      const data = await response.json();

      return {
        success: data.result === 'SUCCESS',
        status: data.result,
        consensusTimestamp: data.consensus_timestamp,
        transactionId: data.transaction_id,
      };
    } catch (error) {
      console.error('Error fetching transaction status:', error);
      return null;
    }
  }
}

export const hederaTransactionService = new HederaTransactionService();
