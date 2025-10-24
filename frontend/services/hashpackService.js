// Dynamic imports to avoid SSR issues with crypto module
let HashConnect = null;
let HashConnectConnectionState = null;
let LedgerId = null;

// Lazy load hashconnect only on client-side
async function loadHashConnect() {
  if (typeof window === 'undefined') {
    // Return mock objects for server-side
    return {
      HashConnect: null,
      HashConnectConnectionState: { Disconnected: 'Disconnected', Paired: 'Paired' },
      LedgerId: null,
    };
  }

  if (!HashConnect) {
    const hashconnect = await import('hashconnect');
    const sdk = await import('@hashgraph/sdk');
    HashConnect = hashconnect.HashConnect;
    HashConnectConnectionState = hashconnect.HashConnectConnectionState;
    LedgerId = sdk.LedgerId;
  }

  return { HashConnect, HashConnectConnectionState, LedgerId };
}

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
    this.state = 'Disconnected';
    this.pairingData = null;
    this.projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';
    this.eventListenersSetup = false;
  }

  async initialize(forceNew = false) {
    try {
      // Clean up any stale/expired WalletConnect data first
      this.cleanupStaleData();

      // Load HashConnect dynamically
      const { HashConnect: HC, HashConnectConnectionState: State, LedgerId: Ledger } = await loadHashConnect();

      if (!HC) {
        console.log('HashConnect not available on server-side');
        return false;
      }

      HashConnect = HC;
      HashConnectConnectionState = State;
      LedgerId = Ledger;

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
      
      // Emit custom event for wallet disconnection
      if (this.pairingData?.accountIds) {
        this.pairingData.accountIds.forEach(accountId => {
          window.dispatchEvent(new CustomEvent('hashpackDisconnected', {
            detail: { address: accountId, walletType: 'hashpack' }
          }));
        });
      }
      
      this.pairingData = null;
      this.state = HashConnectConnectionState?.Disconnected || 'Disconnected';
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

      // If there's an existing pairing, properly disconnect and reinitialize
      if (this.pairingData?.topic) {
        console.log('Existing pairing found, cleaning up completely...');

        // Step 1: Disconnect the existing pairing
        await this.disconnectWallet();

        // Step 2: Destroy the current HashConnect instance
        this.hashconnect = null;
        this.eventListenersSetup = false;

        // Step 3: Wait for cleanup to complete (WalletConnect needs time to clean up)
        console.log('Waiting for cleanup to complete...');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Step 4: Re-initialize HashConnect with a fresh instance
        console.log('Re-initializing HashConnect...');
        await this.initialize();

        // Step 5: Wait a bit more to ensure everything is ready
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log('Opening pairing modal...');
      console.log('Current HashConnect state:', this.state);

      // Open pairing modal with fresh HashConnect instance
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

        try {
          // Disconnect from HashConnect - this removes the pairing from HashPack
          await this.hashconnect.disconnect(this.pairingData.topic);
          console.log('Successfully disconnected from HashPack');
        } catch (disconnectError) {
          console.warn('Error during disconnect (continuing cleanup):', disconnectError);
        }

        // Close any open pairing modals
        try {
          this.hashconnect.closePairingModal();
        } catch (modalError) {
          console.log('No modal to close or already closed');
        }
      }

      // Clear local pairing data
      this.pairingData = null;
      this.state = HashConnectConnectionState?.Disconnected || 'Disconnected';

      // Clear any stored session data
      if (typeof window !== 'undefined') {
        console.log('Clearing WalletConnect and HashConnect storage...');

        // Get all localStorage keys
        const allKeys = Object.keys(localStorage);
        const keysToRemove = allKeys.filter(
          (key) =>
            key.startsWith('hashconnect') ||
            key.startsWith('wc@2') ||
            key.startsWith('wc_') ||
            key.includes('walletconnect') ||
            key.includes('WALLETCONNECT') ||
            key.includes('hashpack')
        );

        console.log(`Removing ${keysToRemove.length} cached keys:`, keysToRemove);
        keysToRemove.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn(`Failed to remove key ${key}:`, e);
          }
        });

        console.log('Cleared HashConnect storage data');
      }

      return true;
    } catch (error) {
      console.error('Error disconnecting wallet:', error);

      // Still clear local state even if disconnect fails
      this.pairingData = null;
      this.state = HashConnectConnectionState?.Disconnected || 'Disconnected';

      // Clear storage regardless
      if (typeof window !== 'undefined') {
        const allKeys = Object.keys(localStorage);
        const keysToRemove = allKeys.filter(
          (key) =>
            key.startsWith('hashconnect') ||
            key.startsWith('wc@2') ||
            key.startsWith('wc_') ||
            key.includes('walletconnect') ||
            key.includes('WALLETCONNECT') ||
            key.includes('hashpack')
        );

        keysToRemove.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn(`Failed to remove key ${key}:`, e);
          }
        });
      }

      // Don't throw - we want cleanup to succeed even if disconnect fails
      return false;
    }
  }

  async disconnectAll() {
    try {
      console.log('Disconnecting all sessions...');

      if (this.hashconnect) {
        // Get all active pairings
        const pairings = this.hashconnect.hcData?.pairingData || [];

        console.log(`Found ${pairings.length} active pairings to disconnect`);

        // Disconnect each pairing
        for (const pairing of pairings) {
          if (pairing?.topic) {
            try {
              await this.hashconnect.disconnect(pairing.topic);
              console.log('Disconnected topic:', pairing.topic);
            } catch (err) {
              console.warn('Error disconnecting topic (continuing):', pairing.topic, err);
            }
          }
        }

        // Close any open modals
        try {
          this.hashconnect.closePairingModal();
        } catch (modalError) {
          console.log('No modal to close or already closed');
        }
      }

      // Clear local state
      this.pairingData = null;
      this.state = HashConnectConnectionState?.Disconnected || 'Disconnected';

      // Clear all HashConnect related data from localStorage
      if (typeof window !== 'undefined') {
        console.log('Clearing all WalletConnect and HashConnect storage...');

        const allKeys = Object.keys(localStorage);
        const keysToRemove = allKeys.filter(
          (key) =>
            key.startsWith('hashconnect') ||
            key.startsWith('wc@2') ||
            key.startsWith('wc_') ||
            key.includes('walletconnect') ||
            key.includes('WALLETCONNECT') ||
            key.includes('hashpack')
        );

        console.log(`Removing ${keysToRemove.length} cached keys`);
        keysToRemove.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn(`Failed to remove key ${key}:`, e);
          }
        });

        console.log('Cleared all HashConnect storage');
      }

      return true;
    } catch (error) {
      console.error('Error in disconnectAll:', error);

      // Force clear everything
      this.pairingData = null;
      this.state = HashConnectConnectionState?.Disconnected || 'Disconnected';

      if (typeof window !== 'undefined') {
        console.warn('Forcing cleanup of WalletConnect storage due to errors');
        const allKeys = Object.keys(localStorage);
        const keysToRemove = allKeys.filter(
          (key) =>
            key.startsWith('hashconnect') ||
            key.startsWith('wc@2') ||
            key.startsWith('wc_') ||
            key.includes('walletconnect') ||
            key.includes('WALLETCONNECT') ||
            key.includes('hashpack')
        );

        keysToRemove.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn(`Failed to remove key ${key}:`, e);
          }
        });
      }

      return false;
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
      this.state === (HashConnectConnectionState?.Paired || 'Paired') &&
      this.pairingData !== null
    );
  }

  getConnectedAccountIds() {
    return this.pairingData?.accountIds || [];
  }

  clearPairing() {
    console.log('Clearing pairing state...');
    this.pairingData = null;
    this.state = HashConnectConnectionState?.Disconnected || 'Disconnected';

    // Clear HashConnect modal if it's open
    if (this.hashconnect) {
      try {
        this.hashconnect.closePairingModal();
      } catch (error) {
        console.log('Error closing pairing modal:', error);
      }
    }
  }

  /**
   * Completely resets the HashConnect service
   * Use this when you need to start fresh (e.g., after errors or to clear all stale data)
   */
  async reset() {
    console.log('Resetting HashConnect service completely...');

    try {
      // Disconnect all pairings
      await this.disconnectAll();

      // Destroy the instance
      this.hashconnect = null;
      this.pairingData = null;
      this.state = 'Disconnected';
      this.eventListenersSetup = false;

      // Re-initialize
      await this.initialize();

      console.log('HashConnect service reset complete');
      return true;
    } catch (error) {
      console.error('Error during reset:', error);
      return false;
    }
  }

  /**
   * Cleans up stale WalletConnect data from localStorage
   * This helps prevent "Expired URI" errors
   */
  cleanupStaleData() {
    if (typeof window === 'undefined') return;

    console.log('Cleaning up stale WalletConnect data...');

    try {
      const allKeys = Object.keys(localStorage);
      let removedCount = 0;

      allKeys.forEach((key) => {
        // Remove expired WalletConnect sessions
        if (key.startsWith('wc@2:') || key.startsWith('wc_')) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              // Check if the data has an expiry timestamp
              if (parsed.expiry && parsed.expiry < Date.now() / 1000) {
                localStorage.removeItem(key);
                removedCount++;
                console.log(`Removed expired session: ${key}`);
              }
            }
          } catch (e) {
            // If we can't parse it, it might be corrupted - remove it
            localStorage.removeItem(key);
            removedCount++;
            console.log(`Removed corrupted session: ${key}`);
          }
        }
      });

      if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} stale WalletConnect sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up stale data:', error);
    }
  }
}

export const hashpackService = new HashPackService();
