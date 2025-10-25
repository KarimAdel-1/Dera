'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import EthereumProvider from '@walletconnect/ethereum-provider';

export function useWalletConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [availableWallets, setAvailableWallets] = useState({
    hashpack: true,
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
          throw new Error('HashPack connection should be handled by HashConnectClient');
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
