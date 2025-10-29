import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Send, Search, ChevronDown } from 'lucide-react';
import { addContact } from '../../../store/contactsSlice';
import { gsap } from 'gsap';
import { hashpackService } from '../../../../services/hashpackService';
import { hederaService } from '../../../../services/hederaService';
import NotificationToast from '../dera-protocol/components/NotificationToast';

const SidebarSection = () => {
  const dispatch = useDispatch();
  const contacts = useSelector((state) => state.contacts.contacts);
  const wallets = useSelector((state) => state.wallet.wallets);
  const defaultWallet = useSelector((state) => state.wallet.defaultWallet);

  // Asset type state
  const [assetType, setAssetType] = useState('HBAR'); // HBAR, HTS_TOKEN, NFT, RWA
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);

  // Common fields
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  // Token-specific fields
  const [tokenAddress, setTokenAddress] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedNFT, setSelectedNFT] = useState(null);

  // Wallet assets
  const [userTokens, setUserTokens] = useState([]);
  const [userNFTs, setUserNFTs] = useState([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState(false);

  // UI state
  const [showAddContact, setShowAddContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const barRef = useRef(null);
  const inputRef = useRef(null);
  const addContactRef = useRef(null);
  const dropdownRef = useRef(null);

  const senderWallet = wallets.find(w => w.address === defaultWallet) || wallets[0];

  const assetTypes = [
    { value: 'HBAR', label: 'HBAR', icon: '⚡' },
    { value: 'HTS_TOKEN', label: 'HTS Token', icon: '🪙' },
    { value: 'NFT', label: 'NFT', icon: '🎨' },
    { value: 'RWA', label: 'RWA Token', icon: '🏛️' }
  ];

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  // Fetch user's tokens and NFTs when wallet connects
  useEffect(() => {
    const fetchUserAssets = async () => {
      if (!senderWallet?.address) {
        setUserTokens([]);
        setUserNFTs([]);
        return;
      }

      setIsLoadingAssets(true);
      try {
        // Fetch tokens
        const tokens = await hederaService.getTokenBalances(senderWallet.address);

        // Fetch token info for each token to get name/symbol
        const tokensWithInfo = await Promise.all(
          tokens.map(async (token) => {
            const info = await hederaService.getTokenInfo(token.token_id);
            return {
              ...token,
              name: info?.name || 'Unknown Token',
              symbol: info?.symbol || token.token_id,
              decimals: info?.decimals || 0,
              type: info?.type || 'FUNGIBLE_COMMON'
            };
          })
        );

        // Separate fungible tokens and NFTs
        const fungibleTokens = tokensWithInfo.filter(t => t.type === 'FUNGIBLE_COMMON');
        const nfts = tokensWithInfo.filter(t => t.type === 'NON_FUNGIBLE_UNIQUE');

        setUserTokens(fungibleTokens);

        // If there are NFTs, fetch their details
        if (nfts.length > 0) {
          const nftDetails = await hederaService.getAccountNFTs(senderWallet.address);
          setUserNFTs(nftDetails);
        } else {
          setUserNFTs([]);
        }

        console.log('User tokens:', fungibleTokens);
        console.log('User NFTs:', nfts);
      } catch (error) {
        console.error('Error fetching user assets:', error);
        showNotification('Failed to load wallet assets', 'error');
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchUserAssets();
  }, [senderWallet?.address]);

  const handleAssetTypeChange = (type) => {
    setAssetType(type);
    setShowAssetDropdown(false);
    // Reset fields when changing asset type
    setAmount('');
    setTokenAddress('');
    setSerialNumber('');
    setSelectedToken(null);
    setSelectedNFT(null);
  };

  const handleTokenSelect = (token) => {
    setSelectedToken(token);
    setTokenAddress(token.token_id);
    setShowTokenSelector(false);
  };

  const handleNFTSelect = (nft) => {
    setSelectedNFT(nft);
    setTokenAddress(nft.token_id);
    setSerialNumber(nft.serial_number.toString());
    setShowTokenSelector(false);
  };

  const toggleAddContact = () => {
    if (!showAddContact) {
      setShowAddContact(true);
      setTimeout(() => {
        gsap.to(addContactRef.current, {
          height: 'auto',
          opacity: 1,
          duration: 0.4,
          ease: 'power3.out',
        });
      }, 0);
    } else {
      gsap.to(addContactRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power3.in',
        onComplete: () => setShowAddContact(false),
      });
    }
  };

  const handleAddContact = () => {
    if (contactName.trim() && contactAddress.trim()) {
      dispatch(
        addContact({ name: contactName, walletAddress: contactAddress })
      );
      setContactName('');
      setContactAddress('');
      toggleAddContact();
    }
  };

  const handleMouseEnter = () => {
    const tl = gsap.timeline();
    tl.to(barRef.current, {
      width: '100%',
      borderRadius: '0 30px 30px 30px',
      justifyContent: 'flex-start',
      paddingLeft: '12px',
      duration: 0.5,
      ease: 'power3.out',
    });
    tl.to(
      inputRef.current,
      { opacity: 1, display: 'block', duration: 0.3 },
      '-=0.2'
    );
  };

  const handleMouseLeave = () => {
    const tl = gsap.timeline();
    tl.to(inputRef.current, {
      opacity: 0,
      duration: 0.2,
      onComplete: () => (inputRef.current.style.display = 'none'),
    });
    tl.to(
      barRef.current,
      {
        width: '52px',
        borderRadius: '50%',
        justifyContent: 'center',
        paddingLeft: '0px',
        duration: 0.5,
        ease: 'power3.inOut',
      },
      '-=0.1'
    );
  };

  const handleSend = async () => {
    // Validation based on asset type
    if (!recipient) {
      showNotification('Please enter a recipient address', 'warning');
      return;
    }

    if (!wallets || wallets.length === 0) {
      showNotification('No wallet connected', 'error');
      return;
    }

    // Asset-specific validation
    if (assetType === 'HBAR') {
      if (!amount || parseFloat(amount) <= 0) {
        showNotification('Please enter a valid amount', 'warning');
        return;
      }
    } else if (assetType === 'HTS_TOKEN' || assetType === 'RWA') {
      if (!tokenAddress) {
        showNotification('Please enter a token address', 'warning');
        return;
      }
      if (!amount || parseFloat(amount) <= 0) {
        showNotification('Please enter a valid amount', 'warning');
        return;
      }
    } else if (assetType === 'NFT') {
      if (!tokenAddress) {
        showNotification('Please enter a token address', 'warning');
        return;
      }
      if (!serialNumber) {
        showNotification('Please enter a serial number', 'warning');
        return;
      }
    }

    setIsSending(true);
    try {
      const { TransferTransaction, Hbar, AccountId, TokenId, NftId } = await import('@hashgraph/sdk');
      const { hederaService } = await import('../../../../services/hederaService');
      const { setWalletData } = await import('../../../store/walletSlice');

      const senderAccountId = senderWallet.address;
      let transaction = new TransferTransaction();

      // Build transaction based on asset type
      switch (assetType) {
        case 'HBAR':
          transaction = transaction
            .addHbarTransfer(senderAccountId, Hbar.fromString(`-${amount}`))
            .addHbarTransfer(AccountId.fromString(recipient), Hbar.fromString(amount));
          break;

        case 'HTS_TOKEN':
        case 'RWA':
          const tokenId = TokenId.fromString(tokenAddress);
          const tokenAmount = Math.floor(parseFloat(amount) * 100); // Assuming 2 decimals
          transaction = transaction
            .addTokenTransfer(tokenId, senderAccountId, -tokenAmount)
            .addTokenTransfer(tokenId, AccountId.fromString(recipient), tokenAmount);
          break;

        case 'NFT':
          const nftTokenId = TokenId.fromString(tokenAddress);
          const serial = parseInt(serialNumber);
          transaction = transaction
            .addNftTransfer(nftTokenId, serial, AccountId.fromString(senderAccountId), AccountId.fromString(recipient));
          break;

        default:
          throw new Error('Invalid asset type');
      }

      const result = await hashpackService.sendTransaction(senderAccountId, transaction);

      // Success message based on asset type
      let successMessage = '';
      switch (assetType) {
        case 'HBAR':
          successMessage = `Successfully sent ${amount} HBAR!`;
          break;
        case 'HTS_TOKEN':
          successMessage = `Successfully sent ${amount} HTS tokens!`;
          break;
        case 'NFT':
          successMessage = `Successfully sent NFT #${serialNumber}!`;
          break;
        case 'RWA':
          successMessage = `Successfully sent ${amount} RWA tokens!`;
          break;
      }

      showNotification(successMessage, 'success');

      // Reset form
      setAmount('');
      setRecipient('');
      setTokenAddress('');
      setSerialNumber('');

      // Refresh transactions after successful send
      setTimeout(async () => {
        const transactions = await hederaService.getAccountTransactions(senderAccountId, 10);
        const balanceData = await hederaService.getAccountBalance(senderAccountId);
        dispatch(setWalletData({
          accountId: senderAccountId,
          data: {
            hbarBalance: balanceData.hbarBalance,
            transactions,
          },
        }));
      }, 2000);
    } catch (error) {
      console.error(`Error sending ${assetType}:`, error);
      showNotification(`Failed to send ${assetType}: ${error.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const maxVisibleContacts = 5;
  const visibleContacts = filteredContacts.slice(0, maxVisibleContacts);
  const remainingCount = filteredContacts.length - maxVisibleContacts;

  return (
    <div className="col-span-1 md:col-span-2 xl:col-span-1 xl:row-start-1 xl:col-start-3 xl:row-span-2 h-auto xl:h-[770px]">
      <div className="hidden sm:block bg-[var(--color-bg-card)] rounded-[12px] sm:rounded-[20px] border border-[var(--color-border-primary)] h-full p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h3 className="text-[var(--color-text-primary)] text-[16px] sm:text-[18px] font-normal">
            Quick Transfer
          </h3>
          <span
            onClick={toggleAddContact}
            className="text-[var(--color-primary)] text-[12px] sm:text-[13px] font-normal cursor-pointer hover:opacity-80"
          >
            {showAddContact ? '- Close' : '+ Add contract'}
          </span>
        </div>

        <div className="mb-4 sm:mb-6">
          <div
            ref={barRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="relative flex items-center justify-center bg-[var(--color-bg-card)] w-[52px] h-[52px] rounded-full overflow-hidden border border-[var(--color-border-primary)] mb-3"
          >
            <div className="flex-shrink-0 bg-[var(--color-bg-hover)] p-2 rounded-full">
              <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="ml-2 w-full bg-transparent border-none text-[var(--color-text-primary)] text-[13px] focus:outline-none hidden"
              style={{ opacity: 0 }}
            />
          </div>
          
          <div className="flex flex-wrap gap-3">
            {visibleContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setRecipient(contact.walletAddress)}
                className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80"
              >
                <div className="w-[48px] h-[48px] bg-[var(--color-primary)] flex items-center justify-center rounded-full">
                  <span className="text-white text-[16px] font-medium">
                    {contact.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-[var(--color-text-muted)] text-[10px] max-w-[48px] truncate">
                  {contact.name}
                </span>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="flex flex-col items-center gap-1">
                <div className="w-[48px] h-[48px] bg-[var(--color-bg-hover)] flex items-center justify-center rounded-full border border-[var(--color-border-primary)]">
                  <span className="text-[var(--color-text-primary)] text-[14px] font-medium">
                    +{remainingCount}
                  </span>
                </div>
                <span className="text-[var(--color-text-muted)] text-[10px] max-w-[48px] truncate">
                  More
                </span>
              </div>
            )}
          </div>
        </div>

        {showAddContact && (
          <div
            ref={addContactRef}
            className="mb-4 overflow-hidden"
            style={{ height: 0, opacity: 0 }}
          >
            <div className="p-4 bg-[var(--color-bg-hover)]/30 rounded-lg space-y-3">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contact Name"
                className="w-full px-3 py-2 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] outline-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              />
              <input
                type="text"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                placeholder="Wallet Address (0.0.1234567)"
                className="w-full px-3 py-2 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] outline-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              />
              <button
                onClick={handleAddContact}
                className="w-full bg-[var(--color-primary)] text-white rounded-lg px-4 py-2 text-[13px] hover:bg-[var(--color-primary)]/90"
              >
                Save Contact
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Asset Type Selector */}
          <div>
            <label className="text-[var(--color-text-muted)] text-[11px] sm:text-[12px] font-normal mb-2 block">
              Asset Type
            </label>
            <div className="relative">
              <button
                onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                className="w-full px-3 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] flex items-center justify-between hover:border-[var(--color-primary)]/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>{assetTypes.find(a => a.value === assetType)?.icon}</span>
                  <span>{assetTypes.find(a => a.value === assetType)?.label}</span>
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAssetDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showAssetDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-lg shadow-lg overflow-hidden">
                  {assetTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => handleAssetTypeChange(type.value)}
                      className="w-full px-3 py-2 text-left text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] flex items-center gap-2 transition-colors"
                    >
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-[var(--color-text-muted)] text-[11px] sm:text-[12px] font-normal mb-2 block">
              From (Sender)
            </label>
            <input
              type="text"
              value={senderWallet?.address || 'No wallet connected'}
              disabled
              className="w-full px-3 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-muted)] text-[13px] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[var(--color-text-muted)] text-[11px] sm:text-[12px] font-normal mb-2 block">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0.0.1234567"
              className="w-full px-3 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] outline-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Token Selector (for HTS tokens and RWAs) */}
          {(assetType === 'HTS_TOKEN' || assetType === 'RWA') && (
            <div>
              <label className="text-[var(--color-text-muted)] text-[11px] sm:text-[12px] font-normal mb-2 block">
                Select Token
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTokenSelector(!showTokenSelector)}
                  className="w-full px-3 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] flex items-center justify-between hover:border-[var(--color-primary)]/50 transition-colors"
                >
                  <span>
                    {selectedToken ? `${selectedToken.symbol} (${selectedToken.token_id})` : 'Select a token...'}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTokenSelector ? 'rotate-180' : ''}`} />
                </button>

                {showTokenSelector && (
                  <div className="absolute z-10 w-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {isLoadingAssets ? (
                      <div className="px-3 py-4 text-center text-[var(--color-text-muted)] text-[12px]">
                        Loading tokens...
                      </div>
                    ) : userTokens.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[var(--color-text-muted)] text-[12px]">
                        No tokens found in wallet
                      </div>
                    ) : (
                      userTokens.map((token) => (
                        <button
                          key={token.token_id}
                          onClick={() => handleTokenSelect(token)}
                          className="w-full px-3 py-3 text-left text-[13px] hover:bg-[var(--color-bg-hover)] transition-colors border-b border-[var(--color-border-input)] last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[var(--color-text-primary)] font-medium">{token.symbol}</div>
                              <div className="text-[var(--color-text-muted)] text-[11px]">{token.token_id}</div>
                            </div>
                            <div className="text-[var(--color-text-primary)] text-[12px]">
                              {(token.balance / Math.pow(10, token.decimals)).toFixed(2)}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NFT Selector */}
          {assetType === 'NFT' && (
            <div>
              <label className="text-[var(--color-text-muted)] text-[11px] sm:text-[12px] font-normal mb-2 block">
                Select NFT
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTokenSelector(!showTokenSelector)}
                  className="w-full px-3 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] flex items-center justify-between hover:border-[var(--color-primary)]/50 transition-colors"
                >
                  <span>
                    {selectedNFT ? `${selectedNFT.token_id} #${selectedNFT.serial_number}` : 'Select an NFT...'}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTokenSelector ? 'rotate-180' : ''}`} />
                </button>

                {showTokenSelector && (
                  <div className="absolute z-10 w-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {isLoadingAssets ? (
                      <div className="px-3 py-4 text-center text-[var(--color-text-muted)] text-[12px]">
                        Loading NFTs...
                      </div>
                    ) : userNFTs.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[var(--color-text-muted)] text-[12px]">
                        No NFTs found in wallet
                      </div>
                    ) : (
                      userNFTs.map((nft) => (
                        <button
                          key={`${nft.token_id}-${nft.serial_number}`}
                          onClick={() => handleNFTSelect(nft)}
                          className="w-full px-3 py-3 text-left text-[13px] hover:bg-[var(--color-bg-hover)] transition-colors border-b border-[var(--color-border-input)] last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[var(--color-text-primary)] font-medium">
                                Serial #{nft.serial_number}
                              </div>
                              <div className="text-[var(--color-text-muted)] text-[11px]">{nft.token_id}</div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amount field (not for NFTs) */}
          {assetType !== 'NFT' && (
            <div>
              <label className="text-[var(--color-text-muted)] text-[11px] sm:text-[12px] font-normal mb-2 block">
                Amount ({assetType === 'HBAR' ? 'HBAR' : assetType === 'HTS_TOKEN' ? 'Tokens' : 'RWA Tokens'})
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] outline-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              />
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={isSending || !recipient || (assetType === 'HBAR' && !amount) || ((assetType === 'HTS_TOKEN' || assetType === 'RWA') && (!tokenAddress || !amount)) || (assetType === 'NFT' && (!tokenAddress || !serialNumber))}
            className="inline-flex items-center justify-center gap-2 w-full bg-[var(--color-primary)] text-white rounded-lg px-4 py-3 font-medium text-[13px] sm:text-[14px] hover:bg-[var(--color-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isSending ? 'Sending...' : `Send ${assetTypes.find(a => a.value === assetType)?.label}`}
          </button>
        </div>
      </div>
      
      {notification.show && (
        <NotificationToast message={notification.message} type={notification.type} />
      )}
    </div>
  );
};

export default SidebarSection;
