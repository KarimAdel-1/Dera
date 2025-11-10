import { ethers } from 'ethers';

// Dynamic imports to avoid SSR issues with crypto module
let HashConnect = null;
let HashConnectConnectionState = null;
let LedgerId = null;
let ContractExecuteTransaction = null;
let ContractFunctionParameters = null;
let AccountId = null;

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
      ContractExecuteTransaction: null,
      ContractFunctionParameters: null,
      AccountId: null,
    };
  }

  if (!HashConnect) {
    const hashconnect = await import('hashconnect');
    const sdk = await import('@hashgraph/sdk');
    HashConnect = hashconnect.HashConnect;
    HashConnectConnectionState = hashconnect.HashConnectConnectionState;
    LedgerId = sdk.LedgerId;
    ContractExecuteTransaction = sdk.ContractExecuteTransaction;
    ContractFunctionParameters = sdk.ContractFunctionParameters;
    AccountId = sdk.AccountId;
  }

  return {
    HashConnect,
    HashConnectConnectionState,
    LedgerId,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    AccountId
  };
}

/**
 * Ethers v6 compatible wrapper for HashConnect signer
 * HashConnect's signer only implements signTransaction, but ethers v6 contracts
 * require sendTransaction. This wrapper bridges that gap.
 */
class HashConnectSignerWrapper extends ethers.AbstractSigner {
  constructor(hashConnectSigner, provider, accountId) {
    super(provider);
    this.hashConnectSigner = hashConnectSigner;
    this.accountId = accountId;
  }

  async getAddress() {
    // Convert Hedera account ID to EVM address format
    // Account ID format: 0.0.X -> EVM format: 0x00000000000000000000000000000000XXXXXXXX
    const accountNum = this.accountId.split('.')[2];
    const evmAddress = '0x' + accountNum.padStart(40, '0');
    return evmAddress;
  }

  async signTransaction(transaction) {
    // Use HashConnect's signTransaction method
    return await this.hashConnectSigner.signTransaction(transaction);
  }

  async sendTransaction(transaction) {
    console.log('🔄 HashConnectSignerWrapper.sendTransaction called:', transaction);

    // Populate the transaction with missing fields
    const tx = await this.populateTransaction(transaction);
    console.log('📝 Populated transaction:', tx);

    // Sign the transaction using HashConnect
    const signedTx = await this.signTransaction(tx);
    console.log('✅ Transaction signed:', signedTx);

    // Broadcast the signed transaction using the provider
    const response = await this.provider.broadcastTransaction(signedTx);
    console.log('📡 Transaction broadcasted:', response);

    return response;
  }

  async populateTransaction(transaction) {
    // Let ethers populate the transaction with gasPrice, nonce, etc.
    const populated = await ethers.resolveProperties(transaction);

    // Ensure sender address is set
    if (!populated.from) {
      populated.from = await this.getAddress();
    }

    // Get gas estimate if not provided
    if (!populated.gasLimit && this.provider) {
      try {
        populated.gasLimit = await this.provider.estimateGas(populated);
      } catch (error) {
        console.warn('Could not estimate gas, using default:', error);
        populated.gasLimit = 300000n; // Default gas limit
      }
    }

    // Get gas price if not provided
    if (!populated.gasPrice && !populated.maxFeePerGas && this.provider) {
      try {
        const feeData = await this.provider.getFeeData();
        if (feeData.maxFeePerGas) {
          populated.maxFeePerGas = feeData.maxFeePerGas;
          populated.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } else {
          populated.gasPrice = feeData.gasPrice;
        }
      } catch (error) {
        console.warn('Could not get fee data:', error);
      }
    }

    // Get nonce if not provided
    if (populated.nonce === undefined && this.provider) {
      populated.nonce = await this.provider.getTransactionCount(await this.getAddress(), 'pending');
    }

    // Ensure chainId is set
    if (!populated.chainId && this.provider) {
      const network = await this.provider.getNetwork();
      populated.chainId = network.chainId;
    }

    return populated;
  }

  connect(provider) {
    return new HashConnectSignerWrapper(this.hashConnectSigner, provider, this.accountId);
  }
}

/**
 * Hedera-native transaction builder for contract interactions
 * Uses ContractExecuteTransaction from @hashgraph/sdk instead of ethers
 * This is the preferred method for Hedera as it works natively with HashConnect
 */
class HederaContractExecutor {
  constructor(hashpackService) {
    this.hashpackService = hashpackService;
  }

  /**
   * Convert Hedera account ID (0.0.X) to ContractId format
   * Handles both Hedera format (0.0.X) and EVM format (0x...)
   */
  convertToContractId(address) {
    // If already in 0.0.X format, return as is
    if (address.match(/^\d+\.\d+\.\d+$/)) {
      return address;
    }

    // If EVM address format (0x...), convert to Hedera format
    if (address.startsWith('0x')) {
      try {
        // Remove 0x prefix
        const hex = address.slice(2).toLowerCase();

        // Check if this is a Hedera-style EVM address (mostly zeros)
        // Hedera EVM addresses are in the format: 0x0000000000000000000000000000000000XXXXXX
        // where the actual contract number is in the last few bytes

        // Remove leading zeros to get the significant part
        const trimmed = hex.replace(/^0+/, '') || '0';

        // If the trimmed hex is reasonably small (< 10 characters), it's likely a Hedera ID
        if (trimmed.length <= 10) {
          const decimal = parseInt(trimmed, 16);
          console.log(`📍 Converted EVM address ${address} to Hedera ID: 0.0.${decimal}`);
          return `0.0.${decimal}`;
        }

        // For full 20-byte EVM addresses, we can't convert without querying
        console.error(`❌ Cannot convert full EVM address to Hedera format: ${address}`);
        console.error('Please configure contract addresses in Hedera format (0.0.X) in your environment variables.');
        throw new Error(
          `Contract address must be in Hedera format (0.0.X), not EVM format (0x...).\n` +
          `Received: ${address}\n` +
          `Please update your .env.local with the Hedera contract ID.`
        );
      } catch (error) {
        if (error.message.includes('Contract address must be')) {
          throw error;
        }
        console.error('Error converting EVM address to Hedera format:', error);
        throw new Error(`Invalid EVM address format: ${address}`);
      }
    }

    return address;
  }

  /**
   * Encode a contract function call using ethers Interface
   * @param {object} contractInterface - ethers Interface instance
   * @param {string} functionName - Function to call
   * @param {Array} args - Function arguments
   * @returns {string} Encoded function data
   */
  encodeFunctionCall(contractInterface, functionName, args) {
    return contractInterface.encodeFunctionData(functionName, args);
  }

  /**
   * Execute a contract function using Hedera SDK
   * @param {string} contractAddress - Contract address (0.0.X or 0x format)
   * @param {object} contractInterface - ethers Interface instance for encoding
   * @param {string} functionName - Function to call
   * @param {Array} args - Function arguments
   * @param {object} options - Transaction options (gas, value, etc.)
   * @returns {Promise<object>} Transaction result
   */
  async executeContractFunction(contractAddress, contractInterface, functionName, args, options = {}) {
    try {
      console.log('🔧 Hedera Contract Executor:', {
        contractAddress,
        functionName,
        args,
        options
      });

      // Ensure we have a connected HashPack session
      if (!this.hashpackService.isConnected()) {
        throw new Error('HashPack not connected');
      }

      // Get the signer from HashConnect
      const accountId = this.hashpackService.getConnectedAccountIds()[0];
      if (!accountId) {
        throw new Error('No account ID available');
      }

      const signer = this.hashpackService.hashconnect.getSigner(accountId);
      console.log('✅ Got Hedera signer for account:', accountId);

      // Encode the function call
      const functionData = this.encodeFunctionCall(contractInterface, functionName, args);
      console.log('📝 Encoded function data:', functionData);

      // Import ContractId dynamically from the SDK
      const { ContractId } = await import('@hashgraph/sdk');

      // Create ContractId based on address format
      let contractId;
      if (contractAddress.match(/^\d+\.\d+\.\d+$/)) {
        // Hedera format (0.0.X)
        contractId = ContractId.fromString(contractAddress);
        console.log('🏠 Using Hedera Contract ID:', contractAddress);
      } else if (contractAddress.startsWith('0x')) {
        // EVM address format - use ContractId.fromEvmAddress
        console.log('📍 Converting EVM address to ContractId:', contractAddress);

        try {
          // For Hedera testnet (shard 0, realm 0)
          contractId = ContractId.fromEvmAddress(0, 0, contractAddress);
          console.log('✅ ContractId created from EVM address');
        } catch (error) {
          console.error('❌ Failed to create ContractId from EVM address:', error);
          throw new Error(`Cannot use EVM address with Hedera SDK: ${contractAddress}\nPlease configure contract addresses in Hedera format (0.0.X) in your .env.local`);
        }
      } else {
        throw new Error(`Invalid contract address format: ${contractAddress}`);
      }

      // Create ContractExecuteTransaction
      const tx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(options.gasLimit || 300000)
        .setFunctionParameters(Buffer.from(functionData.slice(2), 'hex')); // Remove 0x and convert to buffer

      // If sending HBAR with the transaction (for payable functions)
      if (options.value) {
        const hbarAmount = Number(options.value) / 100000000; // Convert tinybars to HBAR
        tx.setPayableAmount(hbarAmount);
        console.log('💰 Payable amount:', hbarAmount, 'HBAR');
      }

      console.log('📤 Executing transaction via HashConnect...');

      // Freeze and execute with signer
      const frozenTx = await tx.freezeWithSigner(signer);
      const result = await frozenTx.executeWithSigner(signer);

      console.log('✅ Transaction executed:', {
        transactionId: result.transactionId.toString(),
        status: result.toString()
      });

      // Note: getReceiptWithSigner() doesn't work reliably with HashConnect
      // The transaction is already submitted and will be processed by the network
      // We'll query the status via mirror node instead

      console.log('📋 Transaction submitted successfully. Querying status via mirror node...');

      // Wait for consensus and mirror node indexing
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        // Query transaction status from mirror node with retry logic
        const MIRROR_NODE_URL = process.env.NEXT_PUBLIC_MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com';
        const txId = result.transactionId.toString();

        // Convert transaction ID format for mirror node API
        // From: 0.0.7093470@1762600640.035580204
        // To:   0.0.7093470-1762600640-035580204
        const mirrorNodeTxId = txId.replace('@', '-').replace(/\.(\d+)$/, '-$1');
        console.log('🔍 Querying mirror node with transaction ID:', mirrorNodeTxId);

        // Retry logic for mirror node query (transactions may take time to index)
        let response = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          response = await fetch(`${MIRROR_NODE_URL}/api/v1/transactions/${mirrorNodeTxId}`);

          if (response.ok) {
            break;
          }

          if (response.status === 404 && attempts < maxAttempts - 1) {
            // Transaction not indexed yet, wait and retry
            console.log(`⏳ Transaction not indexed yet, waiting... (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
          } else {
            break;
          }
        }

        if (response.ok) {
          const txData = await response.json();
          const txInfo = txData.transactions?.[0];

          if (txInfo) {
            console.log('✅ Transaction confirmed via mirror node:', {
              result: txInfo.result,
              consensus_timestamp: txInfo.consensus_timestamp
            });

            // CRITICAL: Check for CONTRACT_REVERT_EXECUTED
            // In Hedera, transaction can be submitted but contract can revert!
            if (txInfo.result === 'CONTRACT_REVERT_EXECUTED') {
              // Try to get detailed revert reason from contract results API
              try {
                const mirrorNodeTxIdForContract = mirrorNodeTxId;
                const contractResultResponse = await fetch(
                  `${MIRROR_NODE_URL}/api/v1/contracts/results/${mirrorNodeTxIdForContract}`
                );

                if (contractResultResponse.ok) {
                  const contractData = await contractResultResponse.json();
                  let revertReason = 'Contract execution reverted';

                  // Try to decode revert reason from call_result
                  if (contractData.error_message) {
                    revertReason = contractData.error_message;
                  } else if (contractData.call_result) {
                    const callResult = contractData.call_result;

                    if (callResult.startsWith('0x08c379a0')) {
                      // Standard Solidity revert with message: Error(string)
                      try {
                        const hexData = callResult.slice(10); // Remove '0x08c379a0'
                        const buffer = Buffer.from(hexData, 'hex');
                        // String is ABI encoded: offset (32 bytes) + length (32 bytes) + data
                        const length = parseInt(buffer.slice(32, 64).toString('hex'), 16);
                        revertReason = buffer.slice(64, 64 + length).toString('utf8');
                      } catch (decodeError) {
                        console.warn('Could not decode revert reason:', decodeError);
                      }
                    } else if (callResult.startsWith('0x4e487b71')) {
                      // Panic(uint256) - arithmetic errors, array bounds, etc.
                      try {
                        const panicCode = parseInt(callResult.slice(10), 16);
                        const panicReasons = {
                          0x01: 'Assertion failed',
                          0x11: 'Arithmetic overflow/underflow',
                          0x12: 'Division by zero',
                          0x21: 'Invalid enum value',
                          0x22: 'Invalid storage array access',
                          0x31: 'Pop on empty array',
                          0x32: 'Array index out of bounds',
                          0x41: 'Out of memory',
                          0x51: 'Invalid internal function'
                        };
                        revertReason = panicReasons[panicCode] || `Panic (code: 0x${panicCode.toString(16)})`;
                      } catch (decodeError) {
                        console.warn('Could not decode panic code:', decodeError);
                      }
                    } else if (callResult.length === 10) {
                      // 4-byte custom error selector only (no parameters)
                      revertReason = `Custom error: ${callResult} (no parameters)`;
                    } else {
                      // Custom error with parameters
                      const selector = callResult.slice(0, 10);
                      revertReason = `Custom error: ${selector} with parameters`;
                    }
                  }

                  console.error('❌ CONTRACT REVERTED:', revertReason);
                  const error = new Error(`Contract reverted: ${revertReason}`);
                  error.status = 'CONTRACT_REVERT_EXECUTED';
                  error.transactionId = txId;
                  error.receipt = txInfo;
                  error.revertReason = revertReason;
                  throw error;
                }
              } catch (contractQueryError) {
                // Fallback if contract result query fails
                if (contractQueryError.status === 'CONTRACT_REVERT_EXECUTED') {
                  throw contractQueryError; // Re-throw if it's the error we created above
                }
                console.warn('Could not query contract result:', contractQueryError);
              }

              // Throw generic revert error if we couldn't get details
              console.error('❌ CONTRACT REVERTED (no details available)');
              const error = new Error('Contract execution reverted');
              error.status = 'CONTRACT_REVERT_EXECUTED';
              error.transactionId = txId;
              error.receipt = txInfo;
              throw error;
            }

            // Check if transaction failed (other errors)
            if (txInfo.result !== 'SUCCESS') {
              const error = new Error(`Transaction failed: ${txInfo.result}`);
              error.status = txInfo.result;
              error.transactionId = txId;
              error.receipt = txInfo;
              throw error;
            }

            return {
              transactionId: txId,
              status: 'SUCCESS',
              receipt: {
                status: txInfo.result,
                transactionId: txId,
                consensusTimestamp: txInfo.consensus_timestamp
              }
            };
          }
        }
      } catch (mirrorError) {
        // Re-throw if it's a transaction failure, not a network/query error
        if (mirrorError.status && mirrorError.transactionId) {
          throw mirrorError;
        }
        console.warn('⚠️ Could not query mirror node for receipt:', mirrorError);
      }

      // Fallback: return success since transaction was executed
      console.log('ℹ️ Returning success - transaction was submitted to network');
      return {
        transactionId: result.transactionId.toString(),
        status: 'PENDING',
        receipt: {
          status: 'PENDING',
          transactionId: result.transactionId.toString()
        }
      };

    } catch (error) {
      console.error('❌ Hedera contract execution error:', error);
      throw error;
    }
  }

  /**
   * Execute contract function and wait for consensus
   * Similar to ethers tx.wait()
   */
  async executeAndWait(contractAddress, contractInterface, functionName, args, options = {}) {
    const result = await this.executeContractFunction(
      contractAddress,
      contractInterface,
      functionName,
      args,
      options
    );

    // Hedera transactions reach consensus immediately after receipt
    // No need to wait like in Ethereum
    // Spread result first, then override status to ensure numeric value
    return {
      ...result,
      hash: result.transactionId,
      status: result.status === 'SUCCESS' ? 1 : 0
    };
  }
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

  async getSigner(accountId, provider = null) {
    if (!this.hashconnect) {
      throw new Error('HashConnect not initialized');
    }

    // Check if we have an active pairing using our service's state
    // Don't rely on hashconnect.hcData.pairingData as it's not always populated
    if (!this.isConnected()) {
      console.error('❌ getSigner failed:', {
        state: this.state,
        hasPairingData: !!this.pairingData,
        pairingDataTopic: this.pairingData?.topic,
        hcDataPairings: this.hashconnect.hcData?.pairingData?.length || 0
      });
      throw new Error('No active pairing. Please connect your wallet first.');
    }

    console.log('✅ getSigner check passed:', {
      state: this.state,
      accountId,
      hasPairingData: !!this.pairingData
    });

    // Get the HashConnect signer
    const hashConnectSigner = this.hashconnect.getSigner(accountId);

    if (!hashConnectSigner) {
      throw new Error('Failed to get signer. Please reconnect your wallet.');
    }

    // Log available methods for debugging
    console.log('🔍 HashConnect signer inspection:', {
      signerType: hashConnectSigner.constructor?.name,
      hasSendTransaction: typeof hashConnectSigner.sendTransaction === 'function',
      hasSignTransaction: typeof hashConnectSigner.signTransaction === 'function',
      hasGetAddress: typeof hashConnectSigner.getAddress === 'function',
      hasProvider: !!hashConnectSigner.provider,
      methodCount: Object.keys(hashConnectSigner).filter(k => typeof hashConnectSigner[k] === 'function').length
    });

    // If no provider is passed, create one using the default RPC URL
    if (!provider) {
      const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet.hashio.io/api';
      provider = new ethers.JsonRpcProvider(RPC_URL);
      console.log('📡 Created JSON-RPC provider for signer:', RPC_URL);
    }

    // Wrap the HashConnect signer to make it ethers v6 compatible
    const wrappedSigner = new HashConnectSignerWrapper(hashConnectSigner, provider, accountId);

    console.log('✅ Returning wrapped HashConnect signer (ethers v6 compatible)');
    return wrappedSigner;
  }

  /**
   * Get Hedera-native contract executor
   * This is the recommended way to interact with contracts on Hedera
   * @returns {HederaContractExecutor}
   */
  getContractExecutor() {
    return new HederaContractExecutor(this);
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
