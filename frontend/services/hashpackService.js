import {
  HashConnect,
  HashConnectConnectionState,
  SessionData,
} from 'hashconnect';
import { LedgerId } from '@hashgraph/sdk';

class HashPackService {
  constructor() {
    this.hashconnect = null;
    this.appMetadata = {
      name: 'Dera DApp',
      description: 'Hedera Wallet Connection',
      icons: [
        typeof window !== 'undefined'
          ? `${window.location.origin}/dera-logo--white.png`
          : '/dera-logo--white.png',
      ],
      url:
        typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:3000',
    };
    this.state = HashConnectConnectionState.Disconnected;
    this.pairingData = null;
    this.projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';
    this.eventListenersSetup = false;
  }

  async initialize(forceNew = false) {
    try {
      // If forcing new connection, disconnect first
      if (forceNew && this.hashconnect) {
        console.log('Forcing new HashConnect instance...');
        try {
          await this.disconnectAll();
        } catch (err) {
          console.log('Error during forced disconnect:', err);
        }
        this.hashconnect = null;
      }

      // Create HashConnect instance with testnet
      this.hashconnect = new HashConnect(
        LedgerId.TESTNET,
        this.projectId,
        this.appMetadata,
        true // Enable debug mode
      );

      console.log('HashConnect v3 instance created');

      // Set up event listeners BEFORE calling init
      this.setupEventListeners();

      // Initialize HashConnect
      await this.hashconnect.init();

      console.log('HashConnect v3 initialized successfully');

      return true;
    } catch (error) {
      console.error('Error initializing HashConnect:', error);
      throw error;
    }
  }

  setupEventListeners() {
    if (!this.hashconnect || this.eventListenersSetup) {
      return;
    }

    // Clear any existing listeners first
    this.clearEventListeners();

    // Listen for pairing events
    this.hashconnect.pairingEvent.on((newPairing) => {
      console.log('Pairing event:', newPairing);
      this.pairingData = newPairing;
    });

    // Listen for disconnection events
    this.hashconnect.disconnectionEvent.on((data) => {
      console.log('Disconnection event:', data);
      this.pairingData = null;
      this.state = HashConnectConnectionState.Disconnected;
    });

    // Listen for connection status changes
    this.hashconnect.connectionStatusChangeEvent.on((connectionStatus) => {
      console.log('Connection status changed:', connectionStatus);
      this.state = connectionStatus;
    });

    this.eventListenersSetup = true;
  }

  clearEventListeners() {
    if (this.hashconnect) {
      // HashConnect events don't have removeAllListeners, so we skip cleanup
      // The events will be cleaned up when the instance is destroyed
    }
    this.eventListenersSetup = false;
  }

  async connectWallet() {
    try {
      if (!this.hashconnect) {
        throw new Error('HashConnect not initialized');
      }

      // If there's an existing pairing, disconnect it first to force fresh connection
      if (this.pairingData?.topic) {
        console.log('Existing pairing found, disconnecting first...');
        await this.disconnectWallet();
        // Wait a bit for the disconnect to process
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log('Opening pairing modal...');
      console.log('Current HashConnect state:', this.state);

      // Open pairing modal
      this.hashconnect.openPairingModal();

      // Wait for pairing to complete
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('Connection timeout - clearing pairing state');
          this.clearPairing();
          reject(
            new Error(
              'Connection timeout - please scan QR code or approve in HashPack'
            )
          );
        }, 120000); // 2 minute timeout

        // Listen for pairing event once
        const pairingHandler = (pairingData) => {
          clearTimeout(timeout);
          this.hashconnect.pairingEvent.off(pairingHandler);

          console.log('===================================');
          console.log('PAIRING EVENT RECEIVED');
          console.log('===================================');
          console.log(
            'Full pairing data:',
            JSON.stringify(pairingData, null, 2)
          );
          console.log(
            'Number of accounts:',
            pairingData?.accountIds?.length || 0
          );
          console.log('Account IDs:', pairingData?.accountIds);
          console.log('Network:', pairingData?.network);
          console.log('===================================');

          if (!pairingData?.accountIds || pairingData.accountIds.length === 0) {
            reject(new Error('No accounts found in HashPack wallet'));
            return;
          }

          // Return all accounts from the paired wallet
          const allAccounts = pairingData.accountIds.map((accountId) => ({
            accountId,
            address: accountId,
            network: pairingData.network || 'testnet',
          }));

          console.log('All accounts to be returned:', allAccounts);

          this.pairingData = pairingData;
          resolve(allAccounts);
        };

        this.hashconnect.pairingEvent.once(pairingHandler);
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  async disconnectWallet() {
    try {
      console.log('Starting disconnect process...');

      if (this.hashconnect && this.pairingData?.topic) {
        console.log('Disconnecting topic:', this.pairingData.topic);

        // Disconnect from HashConnect - this removes the pairing from HashPack
        await this.hashconnect.disconnect(this.pairingData.topic);

        console.log('Successfully disconnected from HashPack');
      }

      // Clear local pairing data
      this.pairingData = null;
      this.state = HashConnectConnectionState.Disconnected;

      // Clear any stored session data
      if (typeof window !== 'undefined') {
        // HashConnect stores data in localStorage with these keys
        const hashConnectKeys = Object.keys(localStorage).filter(
          (key) =>
            key.startsWith('hashconnect') ||
            key.startsWith('wc@2') ||
            key.includes('walletconnect')
        );

        hashConnectKeys.forEach((key) => {
          localStorage.removeItem(key);
        });

        console.log('Cleared HashConnect storage data');
      }

      return true;
    } catch (error) {
      console.error('Error disconnecting wallet:', error);

      // Still clear local state even if disconnect fails
      this.pairingData = null;
      this.state = HashConnectConnectionState.Disconnected;

      // Clear storage regardless
      if (typeof window !== 'undefined') {
        const hashConnectKeys = Object.keys(localStorage).filter(
          (key) =>
            key.startsWith('hashconnect') ||
            key.startsWith('wc@2') ||
            key.includes('walletconnect')
        );

        hashConnectKeys.forEach((key) => {
          localStorage.removeItem(key);
        });
      }

      throw error;
    }
  }

  async disconnectAll() {
    try {
      console.log('Disconnecting all sessions...');

      if (this.hashconnect) {
        // Get all active pairings
        const pairings = this.hashconnect.hcData?.pairingData || [];

        // Disconnect each pairing
        for (const pairing of pairings) {
          if (pairing?.topic) {
            try {
              await this.hashconnect.disconnect(pairing.topic);
              console.log('Disconnected topic:', pairing.topic);
            } catch (err) {
              console.error('Error disconnecting topic:', pairing.topic, err);
            }
          }
        }
      }

      // Clear local state
      this.pairingData = null;
      this.state = HashConnectConnectionState.Disconnected;

      // Clear all HashConnect related data from localStorage
      if (typeof window !== 'undefined') {
        const hashConnectKeys = Object.keys(localStorage).filter(
          (key) =>
            key.startsWith('hashconnect') ||
            key.startsWith('wc@2') ||
            key.includes('walletconnect')
        );

        hashConnectKeys.forEach((key) => {
          localStorage.removeItem(key);
        });

        console.log('Cleared all HashConnect storage');
      }

      return true;
    } catch (error) {
      console.error('Error in disconnectAll:', error);

      // Force clear everything
      this.pairingData = null;
      this.state = HashConnectConnectionState.Disconnected;

      if (typeof window !== 'undefined') {
        localStorage.clear(); // Nuclear option - clears everything
      }

      throw error;
    }
  }

  async sendTransaction(accountId, transaction) {
    try {
      if (!this.pairingData?.topic) {
        throw new Error('No wallet connected - please connect first');
      }

      if (!this.hashconnect) {
        throw new Error('HashConnect not initialized');
      }

      // Send transaction using HashConnect v3
      const response = await this.hashconnect.sendTransaction(
        this.pairingData.topic,
        {
          topic: this.pairingData.topic,
          byteArray: transaction.toBytes(),
          metadata: {
            accountToSign: accountId,
            returnTransaction: false,
          },
        }
      );

      return response;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  getSigner(accountId) {
    if (!this.hashconnect) {
      throw new Error('HashConnect not initialized');
    }
    return this.hashconnect.getSigner(accountId);
  }

  getHashConnect() {
    return this.hashconnect;
  }

  getPairingData() {
    return this.pairingData;
  }

  getConnectionState() {
    return this.state;
  }

  isConnected() {
    return (
      this.state === HashConnectConnectionState.Paired &&
      this.pairingData !== null
    );
  }

  getConnectedAccountIds() {
    return this.pairingData?.accountIds || [];
  }

  clearPairing() {
    console.log('Clearing pairing state...');
    this.pairingData = null;
    this.state = HashConnectConnectionState.Disconnected;
    
    // Clear HashConnect modal if it's open
    if (this.hashconnect) {
      try {
        this.hashconnect.closePairingModal();
      } catch (error) {
        console.log('Error closing pairing modal:', error);
      }
    }
  }
}

export const hashpackService = new HashPackService();
