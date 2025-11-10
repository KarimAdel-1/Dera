'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ethers } from 'ethers';
import AccountOverview from './components/AccountOverview';
import SupplyTab from './components/SupplyTab';
import BorrowTab from './components/BorrowTab';
import TestingTab from './components/TestingTab';
import ActionModal from './components/ActionModal';
import NotificationToast from '../../common/NotificationToast';
import TransactionHistory from './components/TransactionHistory';
import DualYieldDisplay from './DualYieldDisplay';
import HCSEventHistory from './HCSEventHistory';
import ProtocolAnalytics from './ProtocolAnalytics';
import { useWalletManagement } from '../../../hooks/useWalletManagement';
import deraProtocolService from '../../../../services/deraProtocolService';

const DeraProtocolDashboard = () => {
  const [activeTab, setActiveTab] = useState('supply');
  const [userAccount, setUserAccount] = useState({
    address: null,
    supplies: [],
    borrows: [],
    totalSupplied: 0,
    totalBorrowed: 0,
    availableToBorrow: 0,
    healthFactor: Infinity
  });
  const [modalState, setModalState] = useState({ isOpen: false, type: '', asset: null });
  const [dualYieldModalOpen, setDualYieldModalOpen] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
  const [assets, setAssets] = useState([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [assetsError, setAssetsError] = useState(null);
  const [walletBalances, setWalletBalances] = useState({});

  // Get wallet state from Redux
  const { wallets, activeWalletId } = useSelector((state) => state.wallet);
  const activeWallet = wallets.find(w => w.id === activeWalletId);

  // Use wallet management hook
  const { connectToHashPack, isConnecting } = useWalletManagement();

  // Initialize deraProtocolService and load assets on mount
  useEffect(() => {
    const init = async () => {
      setIsLoadingAssets(true);
      setAssetsError(null);

      try {
        // Initialize HashPack service to restore pairing from localStorage
        const { hashpackService } = await import('../../../../services/hashpackService');
        await hashpackService.initialize();
        console.log('✅ HashPack service initialized');

        await deraProtocolService.initialize();
        console.log('✅ DeraProtocolService initialized');

        // Fetch supported assets with real contract data ONLY
        const supportedAssets = await deraProtocolService.getSupportedAssets();

        if (supportedAssets && supportedAssets.length > 0) {
          setAssets(supportedAssets);
          console.log('✅ Loaded assets with real contract data:', supportedAssets);
        } else {
          throw new Error('No assets found in Pool contract. Please initialize assets first.');
        }
      } catch (error) {
        console.error('❌ Failed to load assets from contract:', error);
        setAssetsError(error.message);
        setAssets([]);
        showNotification(
          `Failed to load assets: ${error.message}. Please check contract deployment.`,
          'error'
        );
      } finally {
        setIsLoadingAssets(false);
      }
    };
    init();
  }, []);

  // Refresh asset data periodically to get updated APY and rates
  useEffect(() => {
    if (assets.length === 0 || assetsError) return;

    const refreshAssetData = async () => {
      try {
        const updatedAssets = await deraProtocolService.getSupportedAssets();
        if (updatedAssets && updatedAssets.length > 0) {
          setAssets(updatedAssets);
          console.log('🔄 Refreshed asset data:', updatedAssets);
        }
      } catch (error) {
        console.warn('Failed to refresh asset data:', error.message);
      }
    };

    // Refresh every 30 seconds
    const interval = setInterval(refreshAssetData, 30000);
    return () => clearInterval(interval);
  }, [assets.length, assetsError]);

  // Load user positions and wallet balances when wallet connects and assets are loaded
  useEffect(() => {
    if (activeWallet?.address && assets.length > 0) {
      loadUserPositions(activeWallet.address);
      fetchWalletBalances(activeWallet.address); // Fetch wallet balances too
    } else if (!activeWallet?.address) {
      // Reset account when wallet disconnects
      setUserAccount({
        address: null,
        supplies: [],
        borrows: [],
        totalSupplied: 0,
        totalBorrowed: 0,
        availableToBorrow: 0,
        healthFactor: Infinity
      });
      setWalletBalances({});
    }
  }, [activeWallet?.address, assets]);

  /**
   * Fetch wallet balances from Hedera
   */
  const fetchWalletBalances = async (walletAddress) => {
    try {
      console.log('💰 Fetching wallet balances for:', walletAddress);

      // Import hederaService dynamically
      const { hederaService } = await import('../../../../services/hederaService');

      // Get account balance data from mirror node
      const balanceData = await hederaService.getAccountBalance(walletAddress);

      const balances = {};

      // Add HBAR balance
      if (balanceData.hbarBalance) {
        balances['HBAR'] = parseFloat(balanceData.hbarBalance);
      }

      // Add token balances
      if (balanceData.tokens && Array.isArray(balanceData.tokens)) {
        for (const token of balanceData.tokens) {
          // Map token IDs to symbols (you can extend this mapping)
          if (token.symbol) {
            balances[token.symbol] = parseFloat(token.balance);
          }
        }
      }

      console.log('✅ Wallet balances loaded:', balances);
      setWalletBalances(balances);

      return balances;
    } catch (error) {
      console.error('❌ Error fetching wallet balances:', error);
      return {};
    }
  };

  /**
   * Load user positions from Pool contract
   */
  const loadUserPositions = async (userAddress) => {
    try {
      setIsLoadingPositions(true);
      console.log('📊 Loading user positions for:', userAddress);

      // Ensure assets are loaded before querying positions
      if (assets.length === 0) {
        console.warn('⚠️ Assets not loaded yet, skipping position load');
        return;
      }

      // Convert Hedera account ID to EVM format if needed
      const evmAddress = deraProtocolService.convertHederaAccountToEVM(userAddress);
      
      // Get user account data from Pool contract
      const accountData = await deraProtocolService.getUserAccountData(evmAddress);

      console.log('Account data:', accountData);

      // Load supplies and borrows for each asset
      const supplies = [];
      const borrows = [];

      for (const asset of assets) {
        try {
          // Get supply balance
          const supplyBalance = await deraProtocolService.getUserAssetBalance(
            asset.address,
            evmAddress
          );

          if (supplyBalance && BigInt(supplyBalance) > 0n) {
            const amount = Number(ethers.formatUnits(supplyBalance, asset.decimals));
            
            // Get real collateral status from contract
            let collateralEnabled = false;
            try {
              collateralEnabled = await deraProtocolService.getUserCollateralStatus(asset.address, evmAddress);
              console.log(`📊 ${asset.symbol} collateral status from contract:`, collateralEnabled);
            } catch (error) {
              console.warn(`Could not get collateral status for ${asset.symbol}:`, error.message);
            }

            supplies.push({
              asset: asset.symbol,
              amount,
              apy: Number(asset.supplyAPY),
              collateralEnabled,
              address: asset.address
            });
          }

          // Get borrow balance
          const borrowBalance = await deraProtocolService.getUserBorrowBalance(
            asset.address,
            evmAddress
          );

          if (borrowBalance && BigInt(borrowBalance) > 0n) {
            const amount = Number(ethers.formatUnits(borrowBalance, asset.decimals));
            borrows.push({
              asset: asset.symbol,
              amount,
              apy: Number(asset.borrowAPY),
              address: asset.address
            });
          }
        } catch (error) {
          console.warn(`Error loading balances for ${asset.symbol}:`, error.message);
        }
      }

      setUserAccount({
        address: userAddress,
        supplies,
        borrows,
        totalSupplied: accountData.totalSuppliedUSD,
        totalBorrowed: accountData.totalBorrowedUSD,
        availableToBorrow: accountData.availableToBorrowUSD,
        healthFactor: accountData.healthFactor
      });

      console.log('✅ User positions loaded:', { supplies, borrows, accountData });
    } catch (error) {
      console.error('❌ Error loading user positions:', error);
      showNotification('Failed to load positions', 'error');
    } finally {
      setIsLoadingPositions(false);
    }
  };

  /**
   * Connect wallet via HashPack (Supabase integrated)
   */
  const connectWallet = async () => {
    try {
      await connectToHashPack();
      // Position loading will happen automatically via useEffect
      showNotification('Wallet connected successfully!', 'success');
    } catch (error) {
      console.error('Wallet connection error:', error);
      showNotification('Failed to connect wallet', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const openModal = (type, asset) => {
    setModalState({ isOpen: true, type, asset });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: '', asset: null });
  };

  /**
   * Execute real blockchain transaction
   */
  const executeTransaction = async (type, assetSymbol, amount) => {
    try {
      setIsProcessingTransaction(true);

      // Find asset config
      const assetData = assets.find(a => a.symbol === assetSymbol);
      if (!assetData) {
        throw new Error(`Asset ${assetSymbol} not found`);
      }

      // MOCK MODE: Simulate transaction without wallet
      if (!activeWallet) {
        console.log(`🎭 MOCK: Simulating ${type} transaction:`, { asset: assetSymbol, amount });
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock success
        const mockResult = {
          status: 'success',
          transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
          receipt: { gasUsed: '21000' }
        };
        
        // Add to transaction history
        setTransactionHistory(prev => [{
          id: Date.now(),
          type,
          asset: assetSymbol,
          amount,
          timestamp: new Date(),
          status: 'success (mock)',
          hash: mockResult.transactionHash,
          gasUsed: mockResult.receipt.gasUsed
        }, ...prev]);
        
        // Update mock user account
        if (type === 'supply') {
          setUserAccount(prev => ({
            ...prev,
            supplies: [...prev.supplies.filter(s => s.asset !== assetSymbol), {
              asset: assetSymbol,
              amount: (prev.supplies.find(s => s.asset === assetSymbol)?.amount || 0) + parseFloat(amount),
              apy: parseFloat(assetData.supplyAPY),
              collateralEnabled: false,
              address: assetData.address
            }],
            totalSupplied: prev.totalSupplied + (parseFloat(amount) * parseFloat(assetData.price))
          }));
        } else if (type === 'borrow') {
          setUserAccount(prev => ({
            ...prev,
            borrows: [...prev.borrows.filter(b => b.asset !== assetSymbol), {
              asset: assetSymbol,
              amount: (prev.borrows.find(b => b.asset === assetSymbol)?.amount || 0) + parseFloat(amount),
              apy: parseFloat(assetData.borrowAPY),
              address: assetData.address
            }],
            totalBorrowed: prev.totalBorrowed + (parseFloat(amount) * parseFloat(assetData.price))
          }));
        }
        
        closeModal();
        showNotification(`✅ Mock ${type} successful: ${amount} ${assetSymbol}`, 'success');
        return;
      }

      // Convert amount to proper units with decimals
      const amountInUnits = ethers.parseUnits(amount.toString(), assetData.decimals);

      console.log(`🚀 Executing ${type} transaction:`, {
        asset: assetSymbol,
        amount,
        amountInUnits: amountInUnits.toString(),
        userAddress: activeWallet.address
      });

      // Pre-validate transaction based on type
      await validateTransaction(type, assetData, amount, amountInUnits);

      let result;

      switch (type) {
        case 'supply':
          result = await deraProtocolService.supply(
            assetData.address,
            amountInUnits,
            activeWallet.address,
            0 // referral code
          );
          break;

        case 'withdraw':
          // For max withdrawal, use type(uint256).max
          const withdrawAmount = amount === 'max'
            ? ethers.MaxUint256
            : amountInUnits;
          result = await deraProtocolService.withdraw(
            assetData.address,
            withdrawAmount,
            activeWallet.address
          );
          break;

        case 'borrow':
          result = await deraProtocolService.borrow(
            assetData.address,
            amountInUnits,
            0, // referral code
            activeWallet.address
          );
          break;

        case 'repay':
          // For max repayment, use type(uint256).max
          const repayAmount = amount === 'max'
            ? ethers.MaxUint256
            : amountInUnits;
          result = await deraProtocolService.repay(
            assetData.address,
            repayAmount,
            activeWallet.address
          );
          break;

        default:
          throw new Error(`Unknown transaction type: ${type}`);
      }

      console.log('✅ Transaction successful:', result);

      // Add to transaction history
      setTransactionHistory(prev => [{
        id: Date.now(),
        type,
        asset: assetSymbol,
        amount,
        timestamp: new Date(),
        status: result.status,
        hash: result.transactionHash || 'N/A',
        gasUsed: result.receipt?.gasUsed?.toString() || 'N/A'
      }, ...prev]);

      // Reload user positions after transaction
      await loadUserPositions(activeWallet.address);

      // Refresh wallet balances to reflect the transaction
      if (activeWallet?.address) {
        await fetchWalletBalances(activeWallet.address);
      }

      // Refresh asset data to update APY, total supplied, total borrowed, etc.
      try {
        const updatedAssets = await deraProtocolService.getSupportedAssets();
        if (updatedAssets && updatedAssets.length > 0) {
          setAssets(updatedAssets);
          console.log('🔄 Asset data refreshed after transaction');
        }
      } catch (error) {
        console.warn('Could not refresh asset data:', error.message);
      }

      closeModal();
      showNotification(`Successfully ${type}ed ${amount} ${assetSymbol}!`, 'success');
    } catch (error) {
      console.error('❌ Transaction error:', error);

      // Parse error message
      let errorMessage = 'Transaction failed';
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showNotification(errorMessage, 'error');

      // Add failed transaction to history
      setTransactionHistory(prev => [{
        id: Date.now(),
        type,
        asset: assetSymbol,
        amount,
        timestamp: new Date(),
        status: 'failed',
        hash: 'N/A',
        gasUsed: 'N/A',
        error: errorMessage
      }, ...prev]);
    } finally {
      setIsProcessingTransaction(false);
    }
  };

  /**
   * Validate transaction before execution
   */
  const validateTransaction = async (type, assetData, amount, amountInUnits) => {
    const userAddress = activeWallet.address;
    
    switch (type) {
      case 'supply':
        // Check if user has enough balance to supply
        const supply = userAccount.supplies.find(s => s.asset === assetData.symbol);
        if (amount > 0 && !supply) {
          // This is fine - user can supply new assets
        }
        break;
        
      case 'withdraw':
        // Check if user has enough supplied balance
        const suppliedAsset = userAccount.supplies.find(s => s.asset === assetData.symbol);
        if (!suppliedAsset || suppliedAsset.amount < amount) {
          throw new Error(`Insufficient ${assetData.symbol} supplied. Available: ${suppliedAsset?.amount || 0}`);
        }
        break;
        
      case 'borrow':
        // Check borrowing capacity
        if (userAccount.availableToBorrow <= 0) {
          throw new Error('No borrowing capacity. Please supply collateral first.');
        }
        
        // Estimate USD value of borrow amount
        const borrowValueUSD = amount * parseFloat(assetData.price);
        if (borrowValueUSD > userAccount.availableToBorrow) {
          throw new Error(`Borrow amount exceeds capacity. Max: $${userAccount.availableToBorrow.toFixed(2)}`);
        }
        break;
        
      case 'repay':
        // Check if user has debt to repay
        const borrowedAsset = userAccount.borrows.find(b => b.asset === assetData.symbol);
        if (!borrowedAsset || borrowedAsset.amount === 0) {
          throw new Error(`No ${assetData.symbol} debt to repay`);
        }
        
        if (amount !== 'max' && amount > borrowedAsset.amount) {
          throw new Error(`Repay amount exceeds debt. Max: ${borrowedAsset.amount}`);
        }
        break;
    }
  };

  /**
   * Toggle collateral on/off for an asset
   */
  const toggleCollateral = async (assetSymbol) => {
    try {
      const supply = userAccount.supplies.find(s => s.asset === assetSymbol);
      const assetData = assets.find(a => a.symbol === assetSymbol);

      if (!supply || !assetData) {
        showNotification('Asset not found', 'error');
        return;
      }
      
      // MOCK MODE: Simulate collateral toggle without wallet
      if (!activeWallet) {
        console.log(`🎭 MOCK: Toggling collateral for ${assetSymbol}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setUserAccount(prev => ({
          ...prev,
          supplies: prev.supplies.map(s => 
            s.asset === assetSymbol 
              ? { ...s, collateralEnabled: !s.collateralEnabled }
              : s
          )
        }));
        
        showNotification(
          `Collateral ${supply.collateralEnabled ? 'disabled' : 'enabled'} for ${assetSymbol} (mock)`,
          'success'
        );
        return;
      }

      // Check if disabling collateral would cause health factor to drop below 1
      if (supply.collateralEnabled && userAccount.borrows.length > 0) {
        // Calculate if disabling would make health factor < 1
        const totalBorrowedUSD = userAccount.totalBorrowed;
        const assetValueUSD = supply.amount * parseFloat(assetData.price);
        const remainingCollateralUSD = userAccount.totalSupplied - assetValueUSD;
        
        // Simple health factor check (borrowed / (collateral * ltv))
        const estimatedHealthFactor = remainingCollateralUSD * (assetData.ltv / 100) / totalBorrowedUSD;
        
        if (estimatedHealthFactor < 1.1) { // Leave some buffer
          showNotification('Cannot disable collateral: would cause liquidation risk', 'error');
          return;
        }
      }

      setIsProcessingTransaction(true);

      // Use service method for collateral toggle
      const result = await deraProtocolService.toggleCollateral(
        assetData.address,
        !supply.collateralEnabled,
        activeWallet.address
      );

      console.log('✅ Collateral toggled:', result);

      // Wait a moment for state to propagate on-chain before querying
      console.log('⏳ Waiting for on-chain state to propagate...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reload account data and wallet balances
      console.log('🔄 Refreshing account data...');
      await loadUserPositions(activeWallet.address);
      await fetchWalletBalances(activeWallet.address);

      // Refresh asset data to update available to borrow
      const updatedAssets = await deraProtocolService.getSupportedAssets();
      if (updatedAssets && updatedAssets.length > 0) {
        setAssets(updatedAssets);
      }

      showNotification(
        `Collateral ${supply.collateralEnabled ? 'disabled' : 'enabled'} for ${assetSymbol}`,
        'success'
      );
    } catch (error) {
      console.error('❌ Collateral toggle error:', error);
      
      let errorMessage = 'Failed to toggle collateral';
      if (error.message.includes('liquidation')) {
        errorMessage = 'Cannot disable: would cause liquidation risk';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setIsProcessingTransaction(false);
    }
  };

  return (
    <div className="space-y-6 p-0 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-[var(--color-text-primary)] text-[18px] sm:text-[20px] font-normal mb-1">
            Dera Protocol
          </h2>
          <p className="text-[var(--color-text-muted)] text-[13px] sm:text-[14px]">
            Hedera-native lending with dual yield from staking rewards
          </p>
        </div>
        <button
          onClick={() => setDualYieldModalOpen(true)}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-md font-medium hover:bg-[var(--color-primary)]/90 transition-all shadow-xs flex items-center gap-2"
        >
          <span>💎</span>
          Dual Yield
        </button>
      </div>

      <AccountOverview
        userAccount={userAccount}
        onConnect={connectWallet}
        isConnecting={isConnecting}
        isConnected={!!activeWallet}
        isLoadingPositions={isLoadingPositions}
      />

      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] overflow-hidden mb-6">
        <div className="flex border-b border-[var(--color-border-primary)] overflow-x-auto">
          {[
            {key: 'supply', label: 'Supply'},
            {key: 'borrow', label: 'Borrow'},
            {key: 'positions', label: 'Your Positions'},
            {key: 'events', label: 'HCS Events'},
            {key: 'analytics', label: 'Analytics'}
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-6 py-4 font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {isLoadingAssets ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
              <p className="text-[var(--color-text-muted)]">Loading assets with real contract data...</p>
              <p className="text-[var(--color-text-muted)] text-sm mt-2">Fetching APY, LTV, and rates from Pool contract</p>
            </div>
          ) : (
            <>
              {activeTab === 'supply' && (
                <>
                  {assets.some(a => a.supplyAPY === '0.00') && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-[12px] mb-4">
                      <p className="text-[12px] text-yellow-800">
                        <strong>Note:</strong> Some assets show 0% APY because they're not fully configured in the Pool contract. This is normal for development/testing.
                      </p>
                    </div>
                  )}
                  <SupplyTab
                    assets={assets}
                    onSupply={(asset) => openModal('supply', asset)}
                  />
                </>
              )}
              {activeTab === 'borrow' && (
                <>
                  {assets.some(a => a.borrowAPY === '0.00') && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-[12px] mb-4">
                      <p className="text-[12px] text-yellow-800">
                        <strong>Note:</strong> Some assets show 0% borrow APY because they're not fully configured in the Pool contract.
                      </p>
                    </div>
                  )}
                  <BorrowTab
                    assets={assets}
                    availableToBorrow={userAccount.availableToBorrow}
                    onBorrow={(asset) => openModal('borrow', asset)}
                  />
                </>
              )}
              {activeTab === 'positions' && (
                <>
                  <TestingTab
                    supplies={userAccount.supplies}
                    borrows={userAccount.borrows}
                    assets={assets}
                    onWithdraw={(asset) => openModal('withdraw', asset)}
                    onRepay={(asset) => openModal('repay', asset)}
                    onSupplyMore={(asset) => openModal('supply', asset)}
                    onBorrowMore={(asset) => openModal('borrow', asset)}
                    onToggleCollateral={toggleCollateral}
                  />
                  <div className="mt-6">
                    <TransactionHistory transactions={transactionHistory} />
                  </div>
                </>
              )}
              {activeTab === 'events' && (
                <HCSEventHistory />
              )}
              {activeTab === 'analytics' && (
                <ProtocolAnalytics />
              )}
            </>
          )}
        </div>
      </div>

      {modalState.isOpen && (
        <ActionModal
          type={modalState.type}
          asset={modalState.asset}
          assets={assets}
          userAccount={userAccount}
          onClose={closeModal}
          onExecute={executeTransaction}
          isProcessing={isProcessingTransaction}
          walletBalances={walletBalances}
        />
      )}

      {notification.show && (
        <NotificationToast message={notification.message} type={notification.type} />
      )}

      {dualYieldModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDualYieldModalOpen(false)}>
          <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] max-w-5xl w-full max-h-[70vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-500" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] p-3 flex items-center justify-between">
              <h3 className="text-[var(--color-text-primary)] text-[16px] font-medium">Dual Yield Mechanism</h3>
              <button
                onClick={() => setDualYieldModalOpen(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-3">
              <DualYieldDisplay userAddress={activeWallet?.address} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeraProtocolDashboard;
