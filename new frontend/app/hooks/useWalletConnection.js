'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import EthereumProvider from '@walletconnect/ethereum-provider';

export function useWalletConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [availableWallets, setAvailableWallets] = useState({
    hashpack: false,
    kabila: false,
    metamask:
      typeof window !== 'undefined' && typeof window.ethereum !== 'undefined',
    walletconnect: true,
  });

  const [showModal, setShowModal] = useState(false);
  const [modalAccounts, setModalAccounts] = useState([]);
  const [modalResolve, setModalResolve] = useState(null);

  const showAccountSelector = (accounts) => {
    return new Promise((resolve) => {
      setModalAccounts(accounts);
      setModalResolve(() => resolve);
      setShowModal(true);
    });
  };

  const handleAccountSelect = (account) => {
    if (modalResolve) {
      modalResolve(account);
      setShowModal(false);
      setModalResolve(null);
    }
  };

  const handleModalClose = () => {
    if (modalResolve) {
      modalResolve(modalAccounts[0]);
      setShowModal(false);
      setModalResolve(null);
    }
  };

  const connectWallet = useCallback(async (walletType) => {
    setIsConnecting(true);
    setError(null);

    try {
      switch (walletType) {
        // 🟣 HASHCONNECT / HASHPACK
        case 'hashpack': {
          throw new Error('HashPack coming soon');
        }

        // 🟢 KABILA SDK
        case 'kabila': {
          throw new Error('Kabila coming soon');
        }

        // 🟠 METAMASK (EVM)
        case 'metamask': {
          if (typeof window === 'undefined' || !window.ethereum) {
            throw new Error('MetaMask not detected');
          }

          const allAccounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
          });

          if (!allAccounts || !allAccounts.length) {
            throw new Error('MetaMask connection cancelled');
          }

          let selectedAccount = allAccounts[0];
          if (allAccounts.length > 1) {
            selectedAccount = await showAccountSelector(allAccounts);
          }

          const message = `Welcome to Dera App!\n\nPlease sign this message to authenticate.\n\nAccount: ${selectedAccount}\nTimestamp: ${Date.now()}`;
          try {
            await window.ethereum.request({
              method: 'personal_sign',
              params: [message, selectedAccount],
            });
          } catch (signError) {
            return null; // user cancelled signature
          }

          return selectedAccount;
        }

        // 🔵 WALLETCONNECT
        case 'walletconnect': {
          const provider = await EthereumProvider.init({
            projectId: '4a94158be2292a351367614142d4e2fe',
            chains: [1],
            showQrModal: false, // ✅ disables the default popup modal
          });

          await provider.connect();

          const accounts = provider.accounts;
          if (!accounts || !accounts.length) return null;

          return accounts[0];
        }

        default:
          throw new Error('Unsupported wallet type');
      }
    } catch (err) {
      console.error(`[${walletType} connection error]:`, err);
      setError(err.message || `Failed to connect to ${walletType}`);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  return {
    connectWallet,
    isConnecting,
    availableWallets,
    error,
    showModal,
    modalAccounts,
    handleAccountSelect,
    handleModalClose,
  };
}
