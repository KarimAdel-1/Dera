import React from 'react';
import { ArrowUpRight, ArrowDownLeft, ExternalLink } from 'lucide-react';

/**
 * Modal to display transaction details
 */
const TransactionModal = ({
  transaction,
  onClose,
  getTransactionType,
  getTransactionAmount
}) => {
  if (!transaction) return null;

  const formatAmount = (amount) => (amount / 100000000).toFixed(4);
  const formatDateTime = (timestamp) => new Date(timestamp * 1000).toLocaleString();

  const openInHashScan = (transactionId) => {
    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
    const url = `https://hashscan.io/${network}/transaction/${transactionId}`;
    window.open(url, '_blank');
  };

  const txType = getTransactionType(transaction, transaction.walletAddress);
  const amount = getTransactionAmount(transaction, transaction.walletAddress);
  const isReceived = amount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div className="relative bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)] rounded-2xl p-8 shadow-2xl max-w-lg w-full backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isReceived ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {isReceived ? (
                <ArrowDownLeft className="w-5 h-5 text-green-400" />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div>
              <h2 className="text-[var(--color-text-primary)] text-xl font-semibold">
                Transaction Details
              </h2>
              <p className="text-[var(--color-text-muted)] text-sm">{txType} Transaction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-2 hover:bg-[var(--color-bg-hover)] rounded-lg"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Amount Section */}
        <div className="bg-[var(--color-bg-tertiary)]/30 rounded-xl p-4 mb-6">
          <div className="text-center">
            <span className={`text-3xl font-bold block mb-3 ${isReceived ? 'text-green-400' : 'text-red-400'}`}>
              {isReceived ? '+' : ''}{formatAmount(amount)} HBAR
            </span>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              transaction.result === 'SUCCESS'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                transaction.result === 'SUCCESS' ? 'bg-green-400' : 'bg-yellow-400'
              }`}></div>
              {transaction.result === 'SUCCESS' ? 'Completed' : 'Pending'}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--color-bg-tertiary)]/20 rounded-lg p-3">
            <span className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide block mb-1">
              Date & Time
            </span>
            <span className="text-[var(--color-text-primary)] text-sm font-medium">
              {formatDateTime(transaction.consensus_timestamp)}
            </span>
          </div>
          <div className="bg-[var(--color-bg-tertiary)]/20 rounded-lg p-3">
            <span className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide block mb-1">
              Network Fee
            </span>
            <span className="text-[var(--color-text-primary)] text-sm font-medium">
              {formatAmount(transaction.charged_tx_fee || 0)} HBAR
            </span>
          </div>
        </div>

        {/* Transaction Hash */}
        <div className="space-y-4">
          <div className="bg-[var(--color-bg-tertiary)]/20 rounded-lg p-4">
            <span className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide block mb-2">
              Transaction Hash
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-primary)] text-xs font-mono break-all flex-1">
                {transaction.transaction_id}
              </span>
              <button
                onClick={() => openInHashScan(transaction.transaction_id)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1"
                title="View on HashScan"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Transfer Details */}
          {transaction.transfers && transaction.transfers.length > 0 && (
            <div className="bg-[var(--color-bg-tertiary)]/20 rounded-lg p-4">
              <span className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide block mb-3">
                Transfer Details
              </span>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {transaction.transfers.map((transfer, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 bg-[var(--color-bg-secondary)]/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        transfer.amount > 0 ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <span className="text-[var(--color-text-secondary)] text-xs font-mono">
                        {transfer.account}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold ${
                      transfer.amount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transfer.amount > 0 ? '+' : ''}{formatAmount(transfer.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
