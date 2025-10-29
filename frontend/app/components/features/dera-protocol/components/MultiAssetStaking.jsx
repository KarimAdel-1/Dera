import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Lock, TrendingUp, AlertCircle, Clock, Gift, Zap, ChevronDown } from 'lucide-react';
import NotificationToast from './NotificationToast';
import { hederaService } from '../../../../../services/hederaService';

const MultiAssetStaking = () => {
  // Use default wallet from Redux (same pattern as SidebarSection)
  const wallets = useSelector((state) => state.wallet.wallets);
  const defaultWallet = useSelector((state) => state.wallet.defaultWallet);
  const connectedWallet = wallets.find(w => w.address === defaultWallet) || wallets[0];
  const connectedAccount = connectedWallet?.address;

  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Staking form state
  const [assetType, setAssetType] = useState('HBAR'); // HBAR, HTS_TOKEN, NFT, RWA
  const [tokenAddress, setTokenAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [lockPeriod, setLockPeriod] = useState(7); // Days
  const [isStaking, setIsStaking] = useState(false);

  // Wallet assets
  const [userTokens, setUserTokens] = useState([]);
  const [userNFTs, setUserNFTs] = useState([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [showTokenSelector, setShowTokenSelector] = useState(false);

  // User stakes state
  const [userStakes, setUserStakes] = useState([]);
  const [isLoadingStakes, setIsLoadingStakes] = useState(false);

  // Lock period options with APY
  const lockPeriods = [
    { days: 7, apy: 5, label: '7 Days' },
    { days: 30, apy: 10, label: '30 Days' },
    { days: 90, apy: 20, label: '90 Days' },
    { days: 180, apy: 35, label: '180 Days' },
    { days: 365, apy: 50, label: '365 Days' },
  ];

  const assetTypes = [
    { value: 'HBAR', label: 'HBAR', icon: '⚡' },
    { value: 'HTS_TOKEN', label: 'HTS Token', icon: '🪙' },
    { value: 'NFT', label: 'NFT', icon: '🎨' },
    { value: 'RWA', label: 'RWA Token', icon: '🏛️' }
  ];

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
  };

  const selectedPeriod = lockPeriods.find((p) => p.days === lockPeriod);

  const calculateProjectedRewards = () => {
    if (!amount || parseFloat(amount) <= 0) return '0.00';

    const principal = parseFloat(amount);
    const apy = selectedPeriod.apy / 100;
    const days = selectedPeriod.days;

    // Simple interest calculation: principal * apy * (days / 365)
    const rewards = principal * apy * (days / 365);

    return rewards.toFixed(2);
  };

  // Fetch user's tokens and NFTs when wallet connects
  useEffect(() => {
    const fetchUserAssets = async () => {
      if (!connectedAccount) {
        setUserTokens([]);
        setUserNFTs([]);
        return;
      }

      setIsLoadingAssets(true);
      try {
        // Fetch tokens
        const tokens = await hederaService.getTokenBalances(connectedAccount);

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

        setUserTokens(fungibleTokens);

        // Fetch NFTs
        const nftDetails = await hederaService.getAccountNFTs(connectedAccount);
        setUserNFTs(nftDetails);

        console.log('Staking - User tokens:', fungibleTokens);
        console.log('Staking - User NFTs:', nftDetails);
      } catch (error) {
        console.error('Error fetching user assets for staking:', error);
        showNotification('Failed to load wallet assets', 'error');
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchUserAssets();
  }, [connectedAccount]);

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

  const loadUserStakes = async () => {
    if (!connectedAccount) return;

    setIsLoadingStakes(true);
    try {
      // TODO: Integrate with DeraMultiAssetStaking contract
      // const stakes = await stakingService.getUserStakes(connectedAccount);
      // setUserStakes(stakes);

      // Mock data for now
      const mockStakes = [
        {
          stakeId: 1,
          assetType: 'HBAR',
          tokenAddress: '0x0000000000000000000000000000000000000000',
          amount: '100',
          serialNumber: 0,
          startTime: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
          lockPeriod: 30,
          unlockTime: Date.now() + 25 * 24 * 60 * 60 * 1000, // 25 days from now
          rewardAPY: 10,
          accumulatedRewards: '1.37',
          status: 'ACTIVE'
        }
      ];

      setUserStakes(mockStakes);
    } catch (error) {
      console.error('Error loading stakes:', error);
      showNotification('Failed to load your stakes', 'error');
    } finally {
      setIsLoadingStakes(false);
    }
  };

  useEffect(() => {
    loadUserStakes();
  }, [connectedAccount]);

  const handleStake = async () => {
    if (!connectedAccount) {
      showNotification('Please connect your wallet first', 'warning');
      return;
    }

    // Validation
    if (assetType === 'HBAR' || assetType === 'HTS_TOKEN' || assetType === 'RWA') {
      if (!amount || parseFloat(amount) <= 0) {
        showNotification('Please enter a valid amount', 'warning');
        return;
      }
      if ((assetType === 'HTS_TOKEN' || assetType === 'RWA') && !tokenAddress) {
        showNotification('Please enter a token address', 'warning');
        return;
      }
    } else if (assetType === 'NFT') {
      if (!tokenAddress || !serialNumber) {
        showNotification('Please enter token address and serial number', 'warning');
        return;
      }
    }

    setIsStaking(true);
    try {
      // TODO: Integrate with DeraMultiAssetStaking contract
      // Example integration:
      // if (assetType === 'HBAR') {
      //   await stakingService.stakeFungibleToken(
      //     '0x0000000000000000000000000000000000000000', // HBAR address
      //     ethers.utils.parseEther(amount),
      //     lockPeriod * 24 * 60 * 60 // Convert days to seconds
      //   );
      // } else if (assetType === 'NFT') {
      //   await stakingService.stakeNFT(
      //     tokenAddress,
      //     parseInt(serialNumber),
      //     lockPeriod * 24 * 60 * 60
      //   );
      // }

      showNotification(
        `Successfully staked ${assetType === 'NFT' ? 'NFT' : amount + ' ' + assetType} for ${lockPeriod} days!`,
        'success'
      );

      // Reset form
      setAmount('');
      setTokenAddress('');
      setSerialNumber('');

      // Reload stakes
      await loadUserStakes();
    } catch (error) {
      console.error('Error staking:', error);
      showNotification(`Failed to stake: ${error.message}`, 'error');
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async (stakeId) => {
    setIsStaking(true);
    try {
      // TODO: Integrate with contract
      // await stakingService.unstake(stakeId);

      showNotification('Successfully unstaked!', 'success');
      await loadUserStakes();
    } catch (error) {
      console.error('Error unstaking:', error);
      showNotification(`Failed to unstake: ${error.message}`, 'error');
    } finally {
      setIsStaking(false);
    }
  };

  const handleClaimRewards = async (stakeId) => {
    setIsStaking(true);
    try {
      // TODO: Integrate with contract
      // await stakingService.claimRewards(stakeId);

      showNotification('Successfully claimed rewards!', 'success');
      await loadUserStakes();
    } catch (error) {
      console.error('Error claiming rewards:', error);
      showNotification(`Failed to claim rewards: ${error.message}`, 'error');
    } finally {
      setIsStaking(false);
    }
  };

  const formatTimeRemaining = (unlockTime) => {
    const now = Date.now();
    const remaining = unlockTime - now;

    if (remaining <= 0) return 'Unlocked';

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return `${days}d ${hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[var(--color-text-primary)] text-[20px] font-semibold">Multi-Asset Staking</h2>
          <p className="text-[var(--color-text-muted)] text-[13px] mt-1">
            Stake HBAR, HTS tokens, NFTs, and RWAs to earn rewards
          </p>
        </div>
      </div>

      {/* Staking Form */}
      <div className="bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-primary)] p-6">
        <h3 className="text-[var(--color-text-primary)] text-[16px] font-medium mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Stake Assets
        </h3>

        <div className="space-y-4">
          {/* Asset Type Selector */}
          <div>
            <label className="text-[var(--color-text-muted)] text-[12px] font-normal mb-2 block">
              Asset Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {assetTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setAssetType(type.value)}
                  className={`px-4 py-3 rounded-lg border text-[13px] font-medium transition-all ${
                    assetType === type.value
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border-input)] hover:border-[var(--color-primary)]/50'
                  }`}
                >
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Token Selector (for HTS tokens and RWAs) */}
          {(assetType === 'HTS_TOKEN' || assetType === 'RWA') && (
            <div>
              <label className="text-[var(--color-text-muted)] text-[12px] font-normal mb-2 block">
                Select Token from Your Wallet
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTokenSelector(!showTokenSelector)}
                  className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] flex items-center justify-between hover:border-[var(--color-primary)]/50 transition-colors"
                >
                  <span>
                    {selectedToken ? `${selectedToken.symbol} (${selectedToken.token_id})` : 'Select a token...'}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTokenSelector ? 'rotate-180' : ''}`} />
                </button>

                {showTokenSelector && (
                  <div className="absolute z-10 w-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {isLoadingAssets ? (
                      <div className="px-4 py-4 text-center text-[var(--color-text-muted)] text-[12px]">
                        Loading tokens...
                      </div>
                    ) : userTokens.length === 0 ? (
                      <div className="px-4 py-4 text-center text-[var(--color-text-muted)] text-[12px]">
                        No tokens found in wallet
                      </div>
                    ) : (
                      userTokens.map((token) => (
                        <button
                          key={token.token_id}
                          onClick={() => handleTokenSelect(token)}
                          className="w-full px-4 py-3 text-left text-[13px] hover:bg-[var(--color-bg-hover)] transition-colors border-b border-[var(--color-border-input)] last:border-0"
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
              <label className="text-[var(--color-text-muted)] text-[12px] font-normal mb-2 block">
                Select NFT from Your Wallet
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTokenSelector(!showTokenSelector)}
                  className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] flex items-center justify-between hover:border-[var(--color-primary)]/50 transition-colors"
                >
                  <span>
                    {selectedNFT ? `${selectedNFT.token_id} #${selectedNFT.serial_number}` : 'Select an NFT...'}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTokenSelector ? 'rotate-180' : ''}`} />
                </button>

                {showTokenSelector && (
                  <div className="absolute z-10 w-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {isLoadingAssets ? (
                      <div className="px-4 py-4 text-center text-[var(--color-text-muted)] text-[12px]">
                        Loading NFTs...
                      </div>
                    ) : userNFTs.length === 0 ? (
                      <div className="px-4 py-4 text-center text-[var(--color-text-muted)] text-[12px]">
                        No NFTs found in wallet
                      </div>
                    ) : (
                      userNFTs.map((nft) => (
                        <button
                          key={`${nft.token_id}-${nft.serial_number}`}
                          onClick={() => handleNFTSelect(nft)}
                          className="w-full px-4 py-3 text-left text-[13px] hover:bg-[var(--color-bg-hover)] transition-colors border-b border-[var(--color-border-input)] last:border-0"
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

          {/* Amount (for fungible assets) */}
          {assetType !== 'NFT' && (
            <div>
              <label className="text-[var(--color-text-muted)] text-[12px] font-normal mb-2 block">
                Amount to Stake
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              />
            </div>
          )}

          {/* Lock Period Selector */}
          <div>
            <label className="text-[var(--color-text-muted)] text-[12px] font-normal mb-2 block">
              Lock Period
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {lockPeriods.map((period) => (
                <button
                  key={period.days}
                  onClick={() => setLockPeriod(period.days)}
                  className={`px-3 py-3 rounded-lg border text-[12px] font-medium transition-all ${
                    lockPeriod === period.days
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-[var(--color-border-input)] hover:border-[var(--color-primary)]/50'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span>{period.label}</span>
                    <span className="text-[10px] opacity-80">{period.apy}% APY</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Projected Rewards */}
          {assetType !== 'NFT' && amount && (
            <div className="bg-[var(--color-bg-hover)]/30 rounded-lg p-4 border border-[var(--color-border-input)]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)] text-[12px]">Projected Rewards</span>
                <div className="text-right">
                  <div className="text-[var(--color-primary)] text-[16px] font-semibold">
                    {calculateProjectedRewards()} {assetType}
                  </div>
                  <div className="text-[var(--color-text-muted)] text-[10px]">
                    {selectedPeriod?.apy}% APY for {selectedPeriod?.days} days
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NFT Rewards Info */}
          {assetType === 'NFT' && (
            <div className="bg-[var(--color-bg-hover)]/30 rounded-lg p-4 border border-[var(--color-border-input)]">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-[var(--color-text-primary)] text-[12px]">
                  NFT staking rewards: <strong>1 HBAR per day</strong>
                </span>
              </div>
            </div>
          )}

          {/* Stake Button */}
          <button
            onClick={handleStake}
            disabled={isStaking || !connectedAccount}
            className="w-full bg-[var(--color-primary)] text-white rounded-lg px-4 py-3 font-medium text-[14px] hover:bg-[var(--color-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            {isStaking ? 'Staking...' : 'Stake Assets'}
          </button>
        </div>
      </div>

      {/* Active Stakes */}
      <div className="bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-primary)] p-6">
        <h3 className="text-[var(--color-text-primary)] text-[16px] font-medium mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Your Active Stakes
        </h3>

        {isLoadingStakes ? (
          <div className="text-center py-8 text-[var(--color-text-muted)] text-[13px]">
            Loading your stakes...
          </div>
        ) : userStakes.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-[var(--color-text-muted)] text-[13px]">
              You don't have any active stakes yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {userStakes.map((stake) => (
              <div
                key={stake.stakeId}
                className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border-input)]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[var(--color-text-primary)] text-[14px] font-medium">
                        {stake.assetType === 'NFT'
                          ? `NFT #${stake.serialNumber}`
                          : `${stake.amount} ${stake.assetType}`}
                      </span>
                      <span className="px-2 py-0.5 bg-[var(--color-success)]/10 text-[var(--color-success)] text-[10px] rounded-full">
                        {stake.status}
                      </span>
                    </div>
                    <div className="text-[var(--color-text-muted)] text-[11px]">
                      APY: {stake.rewardAPY}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[var(--color-primary)] text-[14px] font-semibold">
                      {stake.accumulatedRewards} {stake.assetType === 'NFT' ? 'HBAR' : stake.assetType}
                    </div>
                    <div className="text-[var(--color-text-muted)] text-[10px]">Rewards</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 text-[11px] text-[var(--color-text-muted)]">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Unlocks in: {formatTimeRemaining(stake.unlockTime)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleClaimRewards(stake.stakeId)}
                    disabled={isStaking || parseFloat(stake.accumulatedRewards) === 0}
                    className="flex-1 bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] border border-[var(--color-border-input)] rounded-lg px-3 py-2 text-[12px] font-medium hover:bg-[var(--color-primary)]/10 hover:border-[var(--color-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Claim Rewards
                  </button>
                  <button
                    onClick={() => handleUnstake(stake.stakeId)}
                    disabled={isStaking || stake.unlockTime > Date.now()}
                    className="flex-1 bg-[var(--color-primary)] text-white rounded-lg px-3 py-2 text-[12px] font-medium hover:bg-[var(--color-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Unstake
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notification.show && (
        <NotificationToast message={notification.message} type={notification.type} />
      )}
    </div>
  );
};

export default MultiAssetStaking;
