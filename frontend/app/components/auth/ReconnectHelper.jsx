'use client';

import { useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { hashpackService } from '../../services/hashpackService';

/**
 * Helper component to force a complete fresh reconnection
 * This clears all cached data and forces HashPack to show account selection
 */
export function ReconnectHelper() {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { disconnectAll, connectWallet } = useWallet();

  const handleCompleteReset = async () => {
    if (!confirm('This will disconnect all wallets and clear all cached data. Continue?')) {
      return;
    }

    setIsReconnecting(true);

    try {
      console.log('=== STARTING COMPLETE RESET ===');
      
      // Step 1: Disconnect from HashPack
      console.log('Step 1: Disconnecting from HashPack...');
      await disconnectAll();
      
      // Step 2: Clear all localStorage
      console.log('Step 2: Clearing localStorage...');
      Object.keys(localStorage).forEach(key => {
        if (
          key.includes('hashconnect') || 
          key.includes('walletconnect') || 
          key.includes('wc@2') ||
          key.includes('connectedWallets') ||
          key.includes('defaultWallet')
        ) {
          localStorage.removeItem(key);
          console.log('  - Removed:', key);
        }
      });
      
      // Step 3: Clear sessionStorage
      console.log('Step 3: Clearing sessionStorage...');
      sessionStorage.clear();
      
      // Step 4: Wait a moment
      console.log('Step 4: Waiting for cleanup...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 5: Reinitialize HashConnect
      console.log('Step 5: Reinitializing HashConnect...');
      await hashpackService.initialize(true); // Force new instance
      
      // Step 6: Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('=== RESET COMPLETE ===');
      console.log('');
      console.log('✅ Now connect your HashPack wallet');
      console.log('📝 When HashPack opens:');
      console.log('   1. Look for account selection/checkboxes');
      console.log('   2. Select ALL your accounts');
      console.log('   3. Click Connect/Approve');
      console.log('');
      
      alert(
        '✅ Reset complete!\n\n' +
        'Now click "Connect Wallet" and:\n' +
        '1. Look for account selection in HashPack\n' +
        '2. Select ALL your accounts\n' +
        '3. Click Connect/Approve'
      );
      
      // Refresh the page to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error during reset:', error);
      alert('Reset failed. Please try manually clearing your browser data.');
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-[var(--color-text-primary)] font-semibold mb-2">
            Only seeing 1 account from HashPack?
          </h3>
          <p className="text-[var(--color-text-secondary)] text-sm mb-3">
            If HashPack previously shared multiple accounts but now only shows one, 
            try a complete reset and fresh reconnection.
          </p>
          <button
            onClick={handleCompleteReset}
            disabled={isReconnecting}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
            {isReconnecting ? 'Resetting...' : 'Complete Reset & Reconnect'}
          </button>
          
          <div className="mt-4 p-3 bg-[var(--color-bg-secondary)] rounded border border-[var(--color-border-primary)]">
            <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">
              💡 After reset, when HashPack opens:
            </p>
            <ol className="text-xs text-[var(--color-text-muted)] space-y-1 list-decimal list-inside">
              <li>Look for a list of your accounts</li>
              <li>You may see checkboxes or a "Select All" option</li>
              <li>Make sure ALL accounts are selected/checked</li>
              <li>Click "Connect" or "Approve"</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}