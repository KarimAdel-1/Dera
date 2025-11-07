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
      HashConnectConnectionState: {
        Disconnected: 'Disconnected',
        Paired: 'Paired',
      },
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
    this.projectId =
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
      'c4f79cc821944d9680842e34466bfbd';
    this.eventListenersSetup = false;
  }

  async initialize(forceNew = false) {
    try {
      // Load HashConnect dynamically
      const {
        HashConnect: HC,
        HashConnectConnectionState: State,
        LedgerId: Ledger,
      } = await loadHashConnect();

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

      // If already initialized and not forcing new, skip re-initialization
      if (!forceNew && this.hashconnect) {
        console.log('✅ HashConnect already initialized, skipping re-initialization');

        // But check if pairing was restored from localStorage
        const pairings = this.hashconnect.hcData?.pairingData || [];
        if (pairings.length > 0 && !this.pairingData) {
          this.pairingData = pairings[0];
          this.state = HashConnectConnectionState?.Paired || 'Paired';
          console.log('✅ Restored pairing state from HashConnect:', this.pairingData.accountIds);
        }

        return true;
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

      // Initialize HashConnect - this will restore pairing from localStorage automatically
      await this.hashconnect.init();

      console.log('HashConnect v3 initialized successfully');

      // Check if pairing was restored
      const pairings = this.hashconnect.hcData?.pairingData || [];
      if (pairings.length > 0) {
        this.pairingData = pairings[0];
        this.state = HashConnectConnectionState?.Paired || 'Paired';
        console.log(
          '✅ Restored pairing from localStorage:',
          this.pairingData.accountIds
        );
      }

      return true;
    } catch (error) {
      console.error('Error initializing HashConnect:', error);
      throw error;
    }
  }

  /**
   * Cleans up orphaned pairings that exist in HashConnect but have no valid session data
   * This helps prevent duplicate connections in HashPack after localStorage is cleared
   */
  async cleanupOrphanedPairings() {
    try {
      if (!this.hashconnect) return;

      // Get all pairings from HashConnect's internal data
      const allPairings = this.hashconnect.hcData?.pairingData || [];

      if (allPairings.length === 0) {
        console.log('No existing pairings found to check');
        return;
      }

      console.log(
        `Found ${allPairings.length} existing pairings, checking for orphaned ones...`
      );

      // If we have pairings but no active connection, they're likely orphaned
      const isConnected =
        this.state === (HashConnectConnectionState?.Paired || 'Paired');

      if (allPairings.length > 0 && !isConnected) {
        console.log(
          'Found orphaned pairings (pairings exist but not connected), cleaning up...'
        );

        for (const pairing of allPairings) {
          if (pairing?.topic) {
            try {
              console.log('Disconnecting orphaned pairing:', pairing.topic);
              await this.hashconnect.disconnect(pairing.topic);
            } catch (err) {
              console.warn('Error disconnecting orphaned pairing:', err);
            }
          }
        }

        // Clear all WalletConnect data after disconnecting orphaned pairings
        this.clearAllWalletConnectData();
        console.log('Orphaned pairings cleaned up');
      } else if (isConnected) {
        console.log(
          'Active connection found, no orphaned pairings to clean up'
        );
      }
    } catch (error) {
      console.error('Error cleaning up orphaned pairings:', error);
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
      // Get the topic from HashConnect's internal data
      const pairings = this.hashconnect.hcData?.pairingData || [];
      if (pairings.length > 0) {
        this.pairingData = {
          ...newPairing,
          topic: pairings[0].topic,
        };
        console.log('✅ Pairing data set with topic:', this.pairingData.topic);
      } else {
        this.pairingData = newPairing;
      }
    });

    // Listen for disconnection events
    this.hashconnect.disconnectionEvent.on((data) => {
      console.log('Disconnection event:', data);

      // Emit custom event for wallet disconnection
      if (this.pairingData?.accountIds) {
        this.pairingData.accountIds.forEach((accountId) => {
          window.dispatchEvent(
            new CustomEvent('hashpackDisconnected', {
              detail: { address: accountId, walletType: 'hashpack' },
            })
          );
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

      // Check if there's an existing pairing - either by topic OR by state being "Paired"
      const isPaired =
        this.state === (HashConnectConnectionState?.Paired || 'Paired');
      const hasPairingTopic = this.pairingData?.topic;

      // Always cleanup if we have an active pairing in our app
      // This prevents pairing accumulation
      if (isPaired || hasPairingTopic) {
        console.log(
          '⚠️ Existing active pairing detected - performing cleanup...'
        );
        console.log('State:', this.state, 'Has topic:', !!hasPairingTopic);
        const oldTopic = this.pairingData?.topic;

        // Step 1: Disconnect ALL pairings (not just the current one)
        try {
          // Get all active pairings from HashConnect
          const allPairings = this.hashconnect.hcData?.pairingData || [];
          console.log(
            `Found ${allPairings.length} active pairings to disconnect`
          );

          // Disconnect each one
          for (const pairing of allPairings) {
            if (pairing?.topic) {
              try {
                console.log('Disconnecting pairing topic:', pairing.topic);
                await this.hashconnect.disconnect(pairing.topic);
                console.log('Pairing disconnected successfully');
              } catch (disconnectError) {
                console.warn(
                  'Error during disconnect (continuing cleanup):',
                  disconnectError
                );
              }
            }
          }

          // Also disconnect the current topic if it exists and wasn't in the list
          if (oldTopic && !allPairings.some((p) => p.topic === oldTopic)) {
            try {
              console.log('Disconnecting current topic:', oldTopic);
              await this.hashconnect.disconnect(oldTopic);
            } catch (disconnectError) {
              console.warn(
                'Error during disconnect (continuing cleanup):',
                disconnectError
              );
            }
          }

          if (allPairings.length === 0 && !oldTopic) {
            console.log(
              'No topics to disconnect, but state is Paired - clearing state'
            );
          }
        } catch (error) {
          console.warn(
            'Error getting/disconnecting pairings (continuing cleanup):',
            error
          );
        }

        try {
          this.hashconnect.closePairingModal();
        } catch (modalError) {
          console.log('No modal to close');
        }

        // Step 2: Clear local state
        this.pairingData = null;
        this.state = 'Disconnected';
        this.eventListenersSetup = false;

        // Step 3: Clear ALL WalletConnect data from localStorage BEFORE destroying instance
        console.log('Clearing WalletConnect storage...');
        this.clearAllWalletConnectData();

        // Step 4: Wait for disconnect to propagate through WalletConnect network
        console.log('Waiting for disconnect to propagate...');
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Step 5: Destroy the HashConnect instance
        console.log('Destroying HashConnect instance...');
        this.hashconnect = null;

        // Step 6: Clear storage again to ensure everything is gone
        this.clearAllWalletConnectData();

        // Step 7: Wait a bit more to ensure complete cleanup
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Step 8: Re-initialize HashConnect with a completely fresh instance
        console.log('Re-initializing HashConnect with fresh instance...');
        await this.initialize();

        // Step 9: Final wait to ensure everything is ready
        await new Promise((resolve) => setTimeout(resolve, 500));

        console.log('Cleanup complete, ready for new pairing');
      }

      console.log('Opening pairing modal...');
      console.log('Current HashConnect state:', this.state);
      console.log('Current pairingData:', this.pairingData);
      console.log(
        'HashConnect instance ID:',
        this.hashconnect ? 'exists' : 'null'
      );

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
        const pairingHandler = async (pairingData) => {
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

          // Wait for HashConnect to update internal state with retry mechanism
          console.log('⏳ Waiting for HashConnect to update internal state...');

          let topic = null;
          let pairings = [];
          let retries = 0;
          const maxRetries = 10; // Try for up to ~2 seconds

          // Retry loop with exponential backoff
          while (retries < maxRetries && !topic) {
            const waitTime = Math.min(100 * Math.pow(1.5, retries), 500); // 100ms, 150ms, 225ms... max 500ms
            await new Promise(resolve => setTimeout(resolve, waitTime));

            pairings = this.hashconnect.hcData?.pairingData || [];
            topic = pairings.length > 0 ? pairings[0].topic : null;

            retries++;

            if (!topic) {
              console.log(`🔄 Retry ${retries}/${maxRetries}: Still waiting for topic (waited ${waitTime}ms)...`);
            }
          }

          console.log('✅ Topic from hcData after wait:', topic);
          console.log('📊 Number of pairings in hcData:', pairings.length);
          console.log('⏱️ Total retries needed:', retries);

          // Return all accounts from the paired wallet
          const allAccounts = pairingData.accountIds.map((accountId) => ({
            accountId,
            address: accountId,
            network: pairingData.network || 'testnet',
          }));

          console.log('All accounts to be returned:', allAccounts);

          // Store complete pairing data from HashConnect's internal state
          // Use the full pairing object from hcData if available, otherwise merge with event data
          if (pairings.length > 0) {
            this.pairingData = pairings[0]; // Use complete object from HashConnect
            console.log('✅ Stored complete pairing data from hcData');
          } else {
            // Fallback: merge topic with event data
            this.pairingData = {
              ...pairingData,
              topic,
            };
            console.log('⚠️ Fallback: Merged topic with event pairingData');
          }

          // Update state to Paired
          this.state = HashConnectConnectionState?.Paired || 'Paired';
          console.log('✅ Service state updated to:', this.state);

          // Save session to database for persistence across localStorage clears
          // Only save if we have a topic
          if (topic) {
            this.saveSessionToDatabase(this.pairingData).catch((err) => {
              console.warn('Failed to save session to database:', err);
            });
          } else {
            console.warn('⚠️ No topic available, skipping database backup');
          }

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

      const topicToDeactivate = this.pairingData?.topic;

      if (this.hashconnect && topicToDeactivate) {
        console.log('Disconnecting topic:', topicToDeactivate);

        try {
          // Disconnect from HashConnect - this removes the pairing from HashPack
          await this.hashconnect.disconnect(topicToDeactivate);
          console.log('Successfully disconnected from HashPack');
        } catch (disconnectError) {
          console.warn(
            'Error during disconnect (continuing cleanup):',
            disconnectError
          );
        }

        // Close any open pairing modals
        try {
          this.hashconnect.closePairingModal();
        } catch (modalError) {
          console.log('No modal to close or already closed');
        }

        // Deactivate session in database
        this.deactivateSessionInDatabase(topicToDeactivate).catch((err) => {
          console.warn('Failed to deactivate session in database:', err);
        });
      }

      // Clear local pairing data
      this.pairingData = null;
      this.state = HashConnectConnectionState?.Disconnected || 'Disconnected';

      // Clear all WalletConnect data using comprehensive cleanup
      this.clearAllWalletConnectData();

      return true;
    } catch (error) {
      console.error('Error disconnecting wallet:', error);

      // Still clear local state even if disconnect fails
      this.pairingData = null;
      this.state = HashConnectConnectionState?.Disconnected || 'Disconnected';

      // Clear storage regardless
      this.clearAllWalletConnectData();

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
              console.warn(
                'Error disconnecting topic (continuing):',
                pairing.topic,
                err
              );
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

      // Clear all WalletConnect data using comprehensive cleanup
      this.clearAllWalletConnectData();

      return true;
    } catch (error) {
      console.error('Error in disconnectAll:', error);

      // Force clear everything
      this.pairingData = null;
      this.state = HashConnectConnectionState?.Disconnected || 'Disconnected';

      // Force clear storage
      this.clearAllWalletConnectData();

      return false;
    }
  }

  async sendTransaction(accountId, transaction) {
    try {
      if (!this.hashconnect) {
        throw new Error('HashConnect not initialized');
      }

      // Get signer
      const signer = this.hashconnect.getSigner(accountId);

      console.log('sendTransaction called with:', {
        accountId,
        hasPairingData: !!this.pairingData,
        signerExists: !!signer,
      });

      if (!signer) {
        throw new Error(
          'HashPack session expired. Please reconnect your wallet.'
        );
      }

      // Freeze with signer's client and execute
      const frozenTx = await transaction.freezeWithSigner(signer);
      const result = await frozenTx.executeWithSigner(signer);

      return result;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  async getSigner(accountId) {
    if (!this.hashconnect) {
      throw new Error('HashConnect not initialized');
    }

    // Check if we have any active pairing in HashConnect's internal data
    const pairings = this.hashconnect.hcData?.pairingData || [];
    if (pairings.length === 0) {
      throw new Error('No active pairing. Please connect your wallet first.');
    }

    // Sync pairingData with HashConnect's internal state (same pattern as initialize())
    if (pairings.length > 0 && !this.pairingData) {
      this.pairingData = pairings[0];
      this.state = HashConnectConnectionState?.Paired || 'Paired';
      console.log('✅ Synced pairing state in getSigner:', this.pairingData.accountIds);
    }

    // HashConnect v3 provides getSigner directly
    const signer = this.hashconnect.getSigner(accountId);

    if (!signer) {
      throw new Error('Failed to get signer. Please reconnect your wallet.');
    }

    return signer;
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

  /**
   * Completely clears ALL WalletConnect and HashConnect data from localStorage
   * This is more aggressive than cleanupStaleData() and removes everything
   */
  clearAllWalletConnectData() {
    if (typeof window === 'undefined') return;

    console.log(
      'Clearing ALL WalletConnect and HashConnect data from localStorage...'
    );

    try {
      const allKeys = Object.keys(localStorage);
      const keysToRemove = allKeys.filter((key) => {
        return (
          // WalletConnect v2 core data
          key.startsWith('wc@2:') ||
          key.startsWith('wc_') ||
          key.includes('walletconnect') ||
          key.includes('WALLETCONNECT') ||
          // HashConnect specific
          key.startsWith('hashconnect') ||
          key.includes('hashpack') ||
          key.includes('hashconnect') ||
          // WalletConnect pairing and session data
          key.includes(':pairing') ||
          key.includes(':session') ||
          key.includes(':proposal') ||
          key.includes(':request') ||
          key.includes(':expirer') ||
          key.includes(':keychain') ||
          key.includes(':history') ||
          key.includes(':jsonrpc')
        );
      });

      console.log(
        `Found ${keysToRemove.length} WalletConnect/HashConnect keys to remove`
      );

      if (keysToRemove.length > 0) {
        console.log('Keys to remove:', keysToRemove);
      }

      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove key ${key}:`, e);
        }
      });

      console.log(
        `Successfully cleared ${keysToRemove.length} WalletConnect/HashConnect items`
      );
    } catch (error) {
      console.error('Error clearing WalletConnect data:', error);
    }
  }

  // ============================================================================
  // Session Persistence Methods (Database-backed localStorage)
  // ============================================================================

  /**
   * Backup all WalletConnect localStorage data and save to database
   * This allows session recovery after localStorage is cleared
   */
  async saveSessionToDatabase(pairingData) {
    try {
      if (typeof window === 'undefined') return;

      console.log('📦 Backing up WalletConnect session to database...');

      // Get current user from Redux store
      const { store } = await import('../app/store/store.js');
      const state = store.getState();
      const currentUser = state.wallet.currentUser;

      if (!currentUser || !pairingData?.accountIds?.[0]) {
        console.log('⚠️ No user or account ID, skipping session backup');
        return;
      }

      const walletAddress = pairingData.accountIds[0];

      // Backup all WalletConnect data from localStorage
      const wcData = {};
      const allKeys = Object.keys(localStorage);

      allKeys.forEach((key) => {
        if (
          key.startsWith('wc@2:') ||
          key.startsWith('wc_') ||
          key.startsWith('hashconnect') ||
          key.includes('walletconnect')
        ) {
          try {
            wcData[key] = localStorage.getItem(key);
          } catch (e) {
            console.warn(`Failed to backup key ${key}:`, e);
          }
        }
      });

      console.log(
        `📦 Backed up ${Object.keys(wcData).length} localStorage keys`
      );

      // Save to database
      const { supabaseService } = await import('./supabaseService');

      const sessionData = {
        topic: pairingData.topic,
        network: pairingData.network,
        expiry: pairingData.expiry,
        symKey: JSON.stringify(wcData), // Store all localStorage data as JSON
        relay: pairingData.relay,
      };

      await supabaseService.saveWalletConnectSession(
        currentUser.id,
        walletAddress,
        sessionData
      );

      console.log('✅ Session backed up to database successfully');
    } catch (error) {
      console.error('❌ Error backing up session to database:', error);
    }
  }

  /**
   * Restore WalletConnect localStorage data from database
   * Called during initialization if localStorage is empty
   */
  async restoreSessionFromDatabase(userId, walletAddress) {
    try {
      if (typeof window === 'undefined') return false;

      console.log('🔄 Attempting to restore session from database...');

      const { supabaseService } = await import('./supabaseService');
      const session = await supabaseService.getWalletConnectSession(
        userId,
        walletAddress
      );

      if (!session || !session.sym_key) {
        console.log('ℹ️ No session found in database to restore');
        return false;
      }

      // Parse the backed up localStorage data
      let wcData;
      try {
        wcData = JSON.parse(session.sym_key);
      } catch (e) {
        console.error('Failed to parse session data:', e);
        return false;
      }

      if (!wcData || Object.keys(wcData).length === 0) {
        console.log('ℹ️ No localStorage data to restore');
        return false;
      }

      console.log(
        `🔄 Restoring ${Object.keys(wcData).length} localStorage keys...`
      );

      // Restore all WalletConnect data to localStorage
      Object.entries(wcData).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.warn(`Failed to restore key ${key}:`, e);
        }
      });

      console.log('✅ Session restored from database successfully');
      return true;
    } catch (error) {
      console.error('❌ Error restoring session from database:', error);
      return false;
    }
  }

  /**
   * Check if we should attempt session restoration
   * Returns true if localStorage is empty but we might have session in database
   */
  shouldRestoreSession() {
    if (typeof window === 'undefined') return false;

    // Check if localStorage has any WalletConnect data
    const allKeys = Object.keys(localStorage);
    const hasWCData = allKeys.some(
      (key) =>
        key.startsWith('wc@2:') ||
        key.startsWith('wc_') ||
        key.startsWith('hashconnect')
    );

    return !hasWCData; // Should restore if no WC data in localStorage
  }

  /**
   * Deactivate session in database when disconnecting
   */
  async deactivateSessionInDatabase(pairingTopic) {
    try {
      const { supabaseService } = await import('./supabaseService');
      await supabaseService.deactivateWalletConnectSession(pairingTopic);
      console.log('✅ Session deactivated in database');
    } catch (error) {
      console.error('❌ Error deactivating session in database:', error);
    }
  }
}

export const hashpackService = new HashPackService();
