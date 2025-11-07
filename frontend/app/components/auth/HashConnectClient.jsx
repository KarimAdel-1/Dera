'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { hashpackService } from "../../../services/hashpackService.js";
import { connectWallet, disconnectWallet, setNetwork, deleteTempWallet, processWalletConnection, generateUniqueIdentifier, setCurrentUser } from "../../store/walletSlice";
import { store } from "../../store/store.js";
import { walletProvider, WALLET_TYPES } from "../../../services/walletProvider.js";

export const HashConnectClient = () => {
  const dispatch = useDispatch();
  const { network } = useSelector((state) => state.wallet);
  const hashConnectRef = useRef(null);

  const syncWithHashConnect = useCallback(async (selectedNetwork) => {
    console.log('syncWithHashConnect called for network:', selectedNetwork);
    const hc = hashpackService.getHashConnect();
    const pairingData = hashpackService.getPairingData();
    const connectedAccountIds = pairingData?.accountIds || [];
    if (connectedAccountIds.length > 0) {
      console.log('Connected account IDs:', connectedAccountIds);
    }

    if (connectedAccountIds.length > 0) {
      const currentState = store.getState();
      let currentUser = currentState.wallet.currentUser;
      
      // If no current user, create one using the first wallet
      if (!currentUser) {
        try {
          const { supabaseService } = await import('../../../services/supabaseService');
          const uniqueIdentifier = generateUniqueIdentifier(connectedAccountIds[0]);
          currentUser = await supabaseService.createOrGetUser(uniqueIdentifier);
          dispatch(setCurrentUser(currentUser));
        } catch (error) {
          console.error('Error creating user:', error);
        }
      }
      
      // Process each connected account
      for (const accountId of connectedAccountIds) {
        // Check if wallet already exists in Redux state
        const existingWallet = currentState.wallet.wallets.find(w => w.address === accountId && w.walletType === 'hashpack');
        
        console.log('HashConnect - Account ID:', accountId);
        console.log('HashConnect - Existing wallet in Redux:', existingWallet);
        
        if (!existingWallet) {
          try {
            // Use wallet-first check logic
            const cardSkin = currentState.wallet.tempWallet?.cardSkin || 'Card-1.png';
            const walletData = {
              walletType: 'hashpack',
              cardSkin,
              connectedAt: new Date().toISOString()
            };
            
            await dispatch(processWalletConnection(accountId, walletData));
          } catch (error) {
            console.error('Error processing wallet connection:', error);
            // Fallback to basic wallet connection
            const cardSkin = currentState.wallet.tempWallet?.cardSkin || 'Card-1.png';
            const walletData = {
              address: accountId,
              walletType: 'hashpack',
              cardSkin
            };
            dispatch(connectWallet(walletData));
          }
        }
      }
      
      // Clean up temp wallet after processing
      dispatch(deleteTempWallet());

      // Sync walletProvider singleton for DeraProtocolService
      try {
        await walletProvider.checkPreviousConnection(WALLET_TYPES.HASHPACK);
        console.log('✅ walletProvider synced with HashPack connection (auto-restore)');
      } catch (syncError) {
        console.error('⚠️ Failed to sync walletProvider on restore:', syncError);
      }

      // Notify about connection
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('hashpackConnected', {
          detail: { address: connectedAccountIds[0], walletType: 'hashpack' }
        }));
      }, 100);
    } else {
      dispatch(disconnectWallet());
    }
  }, [dispatch]);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      try {
        if (!mounted) return;

        // Check if we should restore session from database (localStorage is empty)
        if (hashpackService.shouldRestoreSession()) {
          console.log('🔄 LocalStorage is empty, checking for saved session in database...');

          // Get current user from Redux state (if available)
          const currentState = store.getState();
          const currentUser = currentState.wallet.currentUser;

          if (currentUser) {
            // Try to restore session for the user's wallets
            const { supabaseService } = await import('../../../services/supabaseService');
            const userWallets = await supabaseService.getUserWallets(currentUser.id);

            if (userWallets && userWallets.length > 0) {
              // Try to restore session for the first active wallet
              const firstWallet = userWallets[0];
              console.log('🔄 Attempting to restore session for wallet:', firstWallet.wallet_address);

              const restored = await hashpackService.restoreSessionFromDatabase(
                currentUser.id,
                firstWallet.wallet_address
              );

              if (restored) {
                console.log('✅ Session restored successfully from database!');
              }
            }
          }
        }

        await hashpackService.initialize();
        if (!mounted) return;

        hashConnectRef.current = hashpackService.getHashConnect();

        syncWithHashConnect(network);
      } catch (error) {
        console.error('HashConnect setup failed:', error);
      }
    };

    setup();

    return () => {
      mounted = false;
    };
  }, [network, syncWithHashConnect, dispatch]);

  return null;
};

export const HashConnectButton = () => {
  const { isConnected, network, wallets } = useSelector((state) => state.wallet);
  const dispatch = useDispatch();
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => dispatch(setNetwork('testnet'))}
          className={`px-3 py-1 text-xs rounded ${network === 'testnet' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Testnet
        </button>
        <button
          onClick={() => dispatch(setNetwork('mainnet'))}
          className={`px-3 py-1 text-xs rounded ${network === 'mainnet' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Mainnet
        </button>
      </div>
      <button
        disabled={isOpening}
        className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1a1a2e] hover:bg-[#16213e] text-white rounded-lg transition-colors ${isOpening ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={async () => {
          if (isConnected) {
            await hashpackService.disconnectWallet();
            dispatch(disconnectWallet());
          } else {
            setIsOpening(true);
            try {
              const accounts = await hashpackService.connectWallet();
              if (accounts && accounts.length > 0) {
                const walletData = {
                  walletType: 'hashpack',
                  cardSkin: 'Card-1.png',
                  connectedAt: new Date().toISOString()
                };

                console.log('🚀 About to process wallet connection:', accounts[0].accountId);

                // Use wallet-first check logic
                await dispatch(processWalletConnection(accounts[0].accountId, walletData));

                // Sync walletProvider singleton for DeraProtocolService
                try {
                  await walletProvider.checkPreviousConnection(WALLET_TYPES.HASHPACK);
                  console.log('✅ walletProvider synced with HashPack connection');
                } catch (syncError) {
                  console.error('⚠️ Failed to sync walletProvider, but Redux state is updated:', syncError);
                }

                // Navigate to dashboard after successful connection
                router.push('/dashboard');
              } else {
                console.log('No accounts returned or pairing cancelled');
              }
            } catch (error) {
              console.error('Connection failed:', error);
              // Reset HashConnect state on error
              try {
                await hashpackService.clearPairing();
              } catch (clearError) {
                console.error('Error clearing pairing:', clearError);
              }
            } finally {
              setIsOpening(false);
            }
          }
        }}
      >
        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold">H</span>
        </div>
        {isConnected
          ? `Disconnect Account${wallets.length > 1 ? "s" : ""}`
          : `Connect HashPack (${network})`}
      </button>
    </div>
  );
};