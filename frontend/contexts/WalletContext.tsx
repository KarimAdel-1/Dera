import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HashConnect, HashConnectTypes, MessageTypes } from '@hashgraph/hashconnect';
import { AccountId } from '@hashgraph/sdk';
import toast from 'react-hot-toast';

// Wallet types
export type WalletType = 'hashpack' | 'kabila' | 'blade';

export interface ConnectedWallet {
  id: string;
  type: WalletType;
  accountId: string;
  balance?: string;
  network: string;
  isActive: boolean;
  connectedAt: Date;
}

interface WalletContextType {
  wallets: ConnectedWallet[];
  activeWallet: ConnectedWallet | null;
  isConnecting: boolean;
  connectWallet: (type: WalletType) => Promise<void>;
  disconnectWallet: (walletId: string) => Promise<void>;
  switchActiveWallet: (walletId: string) => void;
  refreshBalances: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
  hashConnect: HashConnect | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [wallets, setWallets] = useState<ConnectedWallet[]>([]);
  const [activeWallet, setActiveWallet] = useState<ConnectedWallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hashConnect, setHashConnect] = useState<HashConnect | null>(null);
  const [pairingData, setPairingData] = useState<HashConnectTypes.SavedPairingData | null>(null);

  // Initialize HashConnect on mount
  useEffect(() => {
    initializeHashConnect();
    loadSavedWallets();
  }, []);

  const initializeHashConnect = async () => {
    try {
      const hc = new HashConnect();

      // Initialize HashConnect
      const appMetadata: HashConnectTypes.AppMetadata = {
        name: 'Dera Platform',
        description: 'DeFi Lending Platform on Hedera',
        icon: '/logo.png',
        url: window.location.origin,
      };

      await hc.init(appMetadata, process.env.NEXT_PUBLIC_HEDERA_NETWORK as 'testnet' | 'mainnet' || 'testnet', false);

      setHashConnect(hc);

      // Set up event listeners
      hc.pairingEvent.on((data) => {
        console.log('Pairing event:', data);
        setPairingData(data);
      });

      hc.disconnectionEvent.on((data) => {
        console.log('Disconnection event:', data);
        handleDisconnection(data);
      });

      hc.connectionStatusChangeEvent.on((state) => {
        console.log('Connection status changed:', state);
      });

    } catch (error) {
      console.error('Failed to initialize HashConnect:', error);
    }
  };

  const loadSavedWallets = () => {
    try {
      const saved = localStorage.getItem('dera_wallets');
      if (saved) {
        const savedWallets = JSON.parse(saved);
        setWallets(savedWallets);
        const active = savedWallets.find((w: ConnectedWallet) => w.isActive);
        if (active) setActiveWallet(active);
      }
    } catch (error) {
      console.error('Failed to load saved wallets:', error);
    }
  };

  const saveWallets = (walletsToSave: ConnectedWallet[]) => {
    try {
      localStorage.setItem('dera_wallets', JSON.stringify(walletsToSave));
    } catch (error) {
      console.error('Failed to save wallets:', error);
    }
  };

  const connectWallet = async (type: WalletType) => {
    setIsConnecting(true);
    try {
      let newWallet: ConnectedWallet | null = null;

      switch (type) {
        case 'hashpack':
          newWallet = await connectHashPack();
          break;
        case 'kabila':
          newWallet = await connectKabila();
          break;
        case 'blade':
          newWallet = await connectBlade();
          break;
        default:
          throw new Error('Unsupported wallet type');
      }

      if (newWallet) {
        // Check if wallet already connected
        const existing = wallets.find(w => w.accountId === newWallet!.accountId);
        if (existing) {
          toast.error('This wallet is already connected');
          setIsConnecting(false);
          return;
        }

        // Deactivate other wallets
        const updatedWallets = wallets.map(w => ({ ...w, isActive: false }));
        updatedWallets.push(newWallet);

        setWallets(updatedWallets);
        setActiveWallet(newWallet);
        saveWallets(updatedWallets);

        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} wallet connected!`);
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const connectHashPack = async (): Promise<ConnectedWallet | null> => {
    if (!hashConnect) {
      throw new Error('HashConnect not initialized');
    }

    try {
      // Create pairing
      const pairingString = hashConnect.generatePairingString(
        pairingData?.topic || '',
        process.env.NEXT_PUBLIC_HEDERA_NETWORK as 'testnet' | 'mainnet' || 'testnet',
        false
      );

      // Open HashPack
      hashConnect.connectToLocalWallet(pairingString);

      // Wait for pairing
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 60000);

        const unsubscribe = hashConnect.pairingEvent.on((data) => {
          clearTimeout(timeout);
          unsubscribe();

          const accountId = data.accountIds[0];
          const wallet: ConnectedWallet = {
            id: `hashpack-${accountId}`,
            type: 'hashpack',
            accountId,
            network: data.network,
            isActive: true,
            connectedAt: new Date(),
          };

          resolve(wallet);
        });
      });
    } catch (error) {
      console.error('HashPack connection error:', error);
      throw error;
    }
  };

  const connectKabila = async (): Promise<ConnectedWallet | null> => {
    // Kabila also uses HashConnect
    if (!hashConnect) {
      throw new Error('HashConnect not initialized');
    }

    try {
      const pairingString = hashConnect.generatePairingString(
        pairingData?.topic || '',
        process.env.NEXT_PUBLIC_HEDERA_NETWORK as 'testnet' | 'mainnet' || 'testnet',
        false
      );

      // Kabila uses the same protocol
      hashConnect.connectToLocalWallet(pairingString);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 60000);

        const unsubscribe = hashConnect.pairingEvent.on((data) => {
          clearTimeout(timeout);
          unsubscribe();

          const accountId = data.accountIds[0];
          const wallet: ConnectedWallet = {
            id: `kabila-${accountId}`,
            type: 'kabila',
            accountId,
            network: data.network,
            isActive: true,
            connectedAt: new Date(),
          };

          resolve(wallet);
        });
      });
    } catch (error) {
      console.error('Kabila connection error:', error);
      throw error;
    }
  };

  const connectBlade = async (): Promise<ConnectedWallet | null> => {
    try {
      // Check if Blade is installed
      if (!(window as any).bladeConnect) {
        throw new Error('Blade wallet is not installed. Please install it from https://bladewallet.io/');
      }

      const bladeConnect = (window as any).bladeConnect;

      // Connect to Blade
      const result = await bladeConnect.createSession({
        name: 'Dera Platform',
        description: 'DeFi Lending Platform',
        url: window.location.origin,
      });

      if (!result.accountId) {
        throw new Error('Failed to get account from Blade wallet');
      }

      const wallet: ConnectedWallet = {
        id: `blade-${result.accountId}`,
        type: 'blade',
        accountId: result.accountId,
        network: process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet',
        isActive: true,
        connectedAt: new Date(),
      };

      return wallet;
    } catch (error) {
      console.error('Blade connection error:', error);
      throw error;
    }
  };

  const disconnectWallet = async (walletId: string) => {
    try {
      const wallet = wallets.find(w => w.id === walletId);
      if (!wallet) return;

      // Disconnect from wallet provider
      if (wallet.type === 'hashpack' || wallet.type === 'kabila') {
        if (hashConnect && pairingData) {
          await hashConnect.disconnect(pairingData.topic);
        }
      } else if (wallet.type === 'blade') {
        if ((window as any).bladeConnect) {
          await (window as any).bladeConnect.killSession();
        }
      }

      // Remove from state
      const updatedWallets = wallets.filter(w => w.id !== walletId);
      setWallets(updatedWallets);

      // If active wallet was removed, set new active or null
      if (activeWallet?.id === walletId) {
        const newActive = updatedWallets[0] || null;
        if (newActive) {
          newActive.isActive = true;
        }
        setActiveWallet(newActive);
      }

      saveWallets(updatedWallets);
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const switchActiveWallet = (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) return;

    const updatedWallets = wallets.map(w => ({
      ...w,
      isActive: w.id === walletId,
    }));

    setWallets(updatedWallets);
    setActiveWallet(wallet);
    saveWallets(updatedWallets);
    toast.success(`Switched to ${wallet.type} wallet`);
  };

  const refreshBalances = async () => {
    // TODO: Implement balance refresh using Hedera SDK or Mirror Node API
    console.log('Refreshing balances...');
  };

  const signTransaction = async (transaction: any) => {
    if (!activeWallet) {
      throw new Error('No active wallet');
    }

    try {
      if (activeWallet.type === 'hashpack' || activeWallet.type === 'kabila') {
        if (!hashConnect || !pairingData) {
          throw new Error('HashConnect not initialized');
        }

        const result = await hashConnect.sendTransaction(pairingData.topic, {
          topic: pairingData.topic,
          byteArray: transaction,
          metadata: {
            accountToSign: activeWallet.accountId,
            returnTransaction: false,
          },
        });

        return result;
      } else if (activeWallet.type === 'blade') {
        if (!(window as any).bladeConnect) {
          throw new Error('Blade wallet not available');
        }

        const result = await (window as any).bladeConnect.signTransaction({
          transaction,
          accountId: activeWallet.accountId,
        });

        return result;
      }
    } catch (error) {
      console.error('Transaction signing failed:', error);
      throw error;
    }
  };

  const handleDisconnection = (data: any) => {
    console.log('Wallet disconnected:', data);
    // Handle unexpected disconnection
    if (activeWallet) {
      toast.error('Wallet disconnected');
      const updatedWallets = wallets.filter(w => w.accountId !== data.accountId);
      setWallets(updatedWallets);
      setActiveWallet(updatedWallets[0] || null);
      saveWallets(updatedWallets);
    }
  };

  const value: WalletContextType = {
    wallets,
    activeWallet,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchActiveWallet,
    refreshBalances,
    signTransaction,
    hashConnect,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};
