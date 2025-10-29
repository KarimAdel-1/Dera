'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ethers } from 'ethers';
import AccountOverview from './components/AccountOverview';
import SupplyTab from './components/SupplyTab';
import BorrowTab from './components/BorrowTab';
import TestingTab from './components/TestingTab';
import ActionModal from './components/ActionModal';
import NotificationToast from './components/NotificationToast';
import TransactionHistory from './components/TransactionHistory';
import DualYieldDisplay from './DualYieldDisplay';
import HCSEventHistory from './HCSEventHistory';
import ProtocolAnalytics from './ProtocolAnalytics';
import { useWalletManagement } from '../../../hooks/useWalletManagement';
import deraProtocolServiceV2 from '../../../../services/deraProtocolServiceV2';

const DeraProtocolDashboard = () => {
  const [activeTab, setActiveTab] = useState('supply');
  const [userAccount, setUserAccount] = useState({
    address: null,
    supplies: [],
    borrows: [],
    totalSupplied: 0,
    totalBorrowed: 0,
    availableToBorrow: 0,
    healthFactor: Infinity,
  });
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: '',
    asset: null,
  });
  const [dualYieldModalOpen, setDualYieldModalOpen] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: '',
  });
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);

  // Get wallet state from Redux
  const { wallets, activeWalletId } = useSelector((state) => state.wallet);
  const activeWallet = wallets.find((w) => w.id === activeWalletId);

  // Use wallet management hook
  const { connectToHashPack, isConnecting } = useWalletManagement();

  // Asset configuration (will be fetched from contract in production)
  const mockAssets = [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      supplyAPY: 3.45,
      borrowAPY: 5.2,
      price: 1.0,
      ltv: 80,
      liquidationThreshold: 85,
      address: process.env.NEXT_PUBLIC_USDC_ADDRESS || '0.0.123456',
      decimals: 6,
    },
    {
      symbol: 'HBAR',
      name: 'Hedera',
      supplyAPY: 2.15,
      borrowAPY: 4.8,
      price: 0.08,
      ltv: 75,
      liquidationThreshold: 80,
      address: process.env.NEXT_PUBLIC_HBAR_ADDRESS || '0.0.123457',
      decimals: 8,
    },
  ];

  // Initialize deraProtocolServiceV2 on mount
  useEffect(() => {
    const init = async () => {
      await deraProtocolServiceV2.initialize();
      console.log('✅ DeraProtocolServiceV2 initialized');
    };
    init();
  }, []);

  // Load user positions when wallet connects
  useEffect(() => {
    if (activeWallet?.address) {
      loadUserPositions(activeWallet.address);
    } else {
      // Reset account when wallet disconnects
      setUserAccount({
        address: null,
        supplies: [],
        borrows: [],
        totalSupplied: 0,
        totalBorrowed: 0,
        availableToBorrow: 0,
        healthFactor: Infinity,
      });
    }
  }, [activeWallet?.address]);

  /**
   * Load user positions from Pool contract
   */
  const loadUserPositions = async (userAddress) => {
    try {
      setIsLoadingPositions(true);
      console.log('📊 Loading user positions for:', userAddress);

      // Get user account data from Pool contract
      const accountData = await deraProtocolServiceV2.getUserAccountData(
        userAddress
      );

      console.log('Account data:', accountData);

      // Load supplies and borrows for each asset
      const supplies = [];
      const borrows = [];

      for (const asset of mockAssets) {
        try {
          // Get supply balance
          const supplyBalance = await deraProtocolServiceV2.getUserAssetBalance(
            asset.address,
            userAddress
          );

          if (supplyBalance && BigInt(supplyBalance) > 0n) {
            const amount = Number(
              ethers.formatUnits(supplyBalance, asset.decimals)
            );
            supplies.push({
              asset: asset.symbol,
              amount,
              apy: asset.supplyAPY,
              collateralEnabled: true, // Will be fetched from contract in production
              address: asset.address,
            });
          }

          // Get borrow balance
          const borrowBalance =
            await deraProtocolServiceV2.getUserBorrowBalance(
              asset.address,
              userAddress
            );

          if (borrowBalance && BigInt(borrowBalance) > 0n) {
            const amount = Number(
              ethers.formatUnits(borrowBalance, asset.decimals)
            );
            borrows.push({
              asset: asset.symbol,
              amount,
              apy: asset.borrowAPY,
              address: asset.address,
            });
          }
        } catch (error) {
          console.warn(
            `Error loading balances for ${asset.symbol}:`,
            error.message
          );
        }
      }

      setUserAccount({
        address: userAddress,
        supplies,
        borrows,
        totalSupplied: accountData.totalSuppliedUSD,
        totalBorrowed: accountData.totalBorrowedUSD,
        availableToBorrow: accountData.availableToBorrowUSD,
        healthFactor: accountData.healthFactor,
      });

      console.log('✅ User positions loaded:', {
        supplies,
        borrows,
        accountData,
      });
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
    setTimeout(
      () => setNotification({ show: false, message: '', type: '' }),
      3000
    );
  };

  const openModal = (type, asset) => {
    if (type === 'borrow' && userAccount.availableToBorrow <= 0) {
      showNotification(
        'Please supply assets and enable collateral first',
        'warning'
      );
      return;
    }
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
      const assetData = mockAssets.find((a) => a.symbol === assetSymbol);
      if (!assetData) {
        throw new Error(`Asset ${assetSymbol} not found`);
      }

      // Convert amount to proper units with decimals
      const amountInUnits = ethers.parseUnits(
        amount.toString(),
        assetData.decimals
      );

      console.log(`🚀 Executing ${type} transaction:`, {
        asset: assetSymbol,
        amount,
        amountInUnits: amountInUnits.toString(),
        userAddress: activeWallet.address,
      });

      let result;

      switch (type) {
        case 'supply':
          result = await deraProtocolServiceV2.supply(
            assetData.address,
            amountInUnits,
            activeWallet.address,
            0 // referral code
          );
          break;

        case 'withdraw':
          // For max withdrawal, use type(uint256).max
          const withdrawAmount =
            amount === 'max' ? ethers.MaxUint256 : amountInUnits;
          result = await deraProtocolServiceV2.withdraw(
            assetData.address,
            withdrawAmount,
            activeWallet.address
          );
          break;

        case 'borrow':
          result = await deraProtocolServiceV2.borrow(
            assetData.address,
            amountInUnits,
            0, // referral code
            activeWallet.address
          );
          break;

        case 'repay':
          // For max repayment, use type(uint256).max
          const repayAmount =
            amount === 'max' ? ethers.MaxUint256 : amountInUnits;
          result = await deraProtocolServiceV2.repay(
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
      setTransactionHistory((prev) => [
        {
          id: Date.now(),
          type,
          asset: assetSymbol,
          amount,
          timestamp: new Date(),
          status: result.status,
          hash: result.transactionHash || 'N/A',
          gasUsed: result.receipt?.gasUsed?.toString() || 'N/A',
        },
        ...prev,
      ]);

      // Reload user positions after transaction
      await loadUserPositions(activeWallet.address);

      closeModal();
      showNotification(
        `Successfully ${type}ed ${amount} ${assetSymbol}!`,
        'success'
      );
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
      setTransactionHistory((prev) => [
        {
          id: Date.now(),
          type,
          asset: assetSymbol,
          amount,
          timestamp: new Date(),
          status: 'failed',
          hash: 'N/A',
          gasUsed: 'N/A',
          error: errorMessage,
        },
        ...prev,
      ]);
    } finally {
      setIsProcessingTransaction(false);
    }
  };

  /**
   * Toggle collateral on/off for an asset
   */
  const toggleCollateral = async (assetSymbol) => {
    try {
      const supply = userAccount.supplies.find((s) => s.asset === assetSymbol);
      const assetData = mockAssets.find((a) => a.symbol === assetSymbol);

      if (!supply || !assetData) {
        showNotification('Asset not found', 'error');
        return;
      }

      // Check if disabling collateral would cause health factor to drop below 1
      if (supply.collateralEnabled && userAccount.borrows.length > 0) {
        // Simple check - in production, calculate exact health factor
        showNotification('Collateral toggle will be available soon', 'warning');
        return;
      }

      setIsProcessingTransaction(true);

      // Call Pool.setUserUseAssetAsCollateral(asset, useAsCollateral)
      const signer = await deraProtocolServiceV2.getSigner();
      const poolAddress = deraProtocolServiceV2.getContractAddress('POOL');

      // Create contract instance with signer
      const PoolABI = (await import('../../../../contracts/abis/Pool.json'))
        .default;
      const poolContract = new ethers.Contract(
        poolAddress,
        PoolABI.abi,
        signer
      );

      console.log('🔄 Toggling collateral for:', {
        asset: assetSymbol,
        address: assetData.address,
        newState: !supply.collateralEnabled,
      });

      const tx = await poolContract.setUserUseAssetAsCollateral(
        assetData.address,
        !supply.collateralEnabled
      );

      const receipt = await tx.wait();

      console.log('✅ Collateral toggled:', receipt);

      // Reload account data
      await loadUserPositions(activeWallet.address);

      showNotification(
        `Collateral ${
          supply.collateralEnabled ? 'disabled' : 'enabled'
        } for ${assetSymbol}`,
        'success'
      );
    } catch (error) {
      console.error('❌ Collateral toggle error:', error);
      showNotification('Failed to toggle collateral', 'error');
    } finally {
      setIsProcessingTransaction(false);
    }
  };

  return (
    <div className="space-y-6">
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
            { key: 'supply', label: 'Supply' },
            { key: 'borrow', label: 'Borrow' },
            { key: 'positions', label: 'Your Positions' },
            { key: 'events', label: 'HCS Events' },
            { key: 'analytics', label: 'Analytics' },
          ].map((tab) => (
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
          {activeTab === 'supply' && (
            <SupplyTab
              assets={mockAssets}
              onSupply={(asset) => openModal('supply', asset)}
              disabled={!activeWallet || isProcessingTransaction}
            />
          )}
          {activeTab === 'borrow' && (
            <BorrowTab
              assets={mockAssets}
              availableToBorrow={userAccount.availableToBorrow}
              onBorrow={(asset) => openModal('borrow', asset)}
              disabled={!activeWallet || isProcessingTransaction}
            />
          )}
          {activeTab === 'positions' && (
            <>
              <TestingTab
                supplies={userAccount.supplies}
                borrows={userAccount.borrows}
                assets={mockAssets}
                onWithdraw={(asset) => openModal('withdraw', asset)}
                onRepay={(asset) => openModal('repay', asset)}
                onSupplyMore={(asset) => openModal('supply', asset)}
                onBorrowMore={(asset) => openModal('borrow', asset)}
                onToggleCollateral={toggleCollateral}
                disabled={isProcessingTransaction}
              />
              <div className="mt-6">
                <TransactionHistory transactions={transactionHistory} />
              </div>
            </>
          )}
          {activeTab === 'events' && <HCSEventHistory />}
          {activeTab === 'analytics' && <ProtocolAnalytics />}
        </div>
      </div>

      {modalState.isOpen && (
        <ActionModal
          type={modalState.type}
          asset={modalState.asset}
          assets={mockAssets}
          userAccount={userAccount}
          onClose={closeModal}
          onExecute={executeTransaction}
          isProcessing={isProcessingTransaction}
        />
      )}

      {notification.show && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
        />
      )}

      {dualYieldModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setDualYieldModalOpen(false)}
        >
          <div
            className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] max-w-5xl w-full max-h-[70vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] p-3 flex items-center justify-between">
              <h3 className="text-[var(--color-text-primary)] text-[16px] font-medium">
                Dual Yield Mechanism
              </h3>
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
