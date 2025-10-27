import React from 'react';
import { useSelector } from 'react-redux';
import { Wallet } from 'lucide-react';

const WalletSection = () => {
  const { wallets, walletsData, defaultWallet, hbarPrice, network } =
    useSelector((state) => state.wallet);

  const formatAddress = (addr) => {
    if (!addr) return 'Not Connected';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const sortedWallets = [...wallets].sort((a, b) => {
    if (a.address === defaultWallet) return -1;
    if (b.address === defaultWallet) return 1;
    return 0;
  });

  const displayWallets = sortedWallets.slice(0, 4);
  const defaultWalletData = displayWallets[0];

  const walletBalance = walletsData[defaultWalletData?.address];
  const hbarBalance = parseFloat(walletBalance?.hbarBalance || '0');
  const usdBalance = hbarBalance * (hbarPrice || 0);

  return (
    <div className="col-span-1 md:col-span-2 xl:col-span-2">
      <div className="relative bg-[var(--color-bg-card)] rounded-[12px] md:rounded-[20px] border border-[var(--color-border-primary)]">
        <div className="absolute inset-0 rounded-[12px] md:rounded-[20px] pointer-events-none overflow-hidden">
          <div
            className="absolute pointer-events-none -rotate-20 rtl:rotate-20 opacity-60"
            style={{
              insetBlockStart: '-140px',
              insetInlineEnd: '-110px',
              inlineSize: '570px',
              blockSize: '260px',
              background:
                'linear-gradient(60deg, var(--color-primary) 0%, #fffb00b0 100%)',
              borderRadius: '50%',
              filter: 'blur(70px)',
              opacity: 1,
              transform: 'none',
            }}
          ></div>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:h-[250px] relative z-10 p-4 md:p-6 gap-6 lg:gap-6">
          {/* Wallet Cards */}
          <div
            className="flex-1 flex justify-center lg:justify-start"
            style={{ minInlineSize: '280px' }}
          >
            <div className="relative w-full h-[200px]">
              {displayWallets.map((wallet, index) => {
                const isDefault = index === 0;
                const walletData = walletsData[wallet?.address];
                const balance = parseFloat(walletData?.hbarBalance || '0');

                return (
                  <div
                    key={wallet.address}
                    className="absolute "
                    style={{
                      zIndex: 20 - index,
                      left: `${index * 20}px`,
                      top: '10px',
                    }}
                  >
                    <div
                      className="w-[250px] md:w-[280px] h-[180px] rounded-[16px] overflow-hidden relative select-none"
                      style={{
                        backgroundImage: `url(/assets/cards/${wallet?.cardSkin || 'Card-1.png'})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        boxShadow:
                          'rgba(0, 0, 0, 0.4) 0px 20px 35px -10px, rgba(0, 0, 0, 0.2) 0px 8px 15px -5px',
                        backgroundColor: '#000',
                      }}
                    >
                      <div className="px-6 py-5 h-full flex flex-col justify-between text-white">
                        <div className="flex justify-between items-start">
                          <Wallet className="w-6 h-6" />
                          <span className="text-white font-semibold text-[16px] tracking-wider">
                            CRYPTO
                          </span>
                        </div>
                        <div
                          className="text-white font-bold text-[16px] mt-6 mb-4"
                          style={{ letterSpacing: '1px' }}
                        >
                          {formatAddress(wallet?.address)}
                        </div>
                        {isDefault && (
                          <div className="flex justify-start items-end mt-auto gap-4">
                            <div>
                              <div className="text-white/70 text-[10px] uppercase mb-1 tracking-wide">
                                Wallet Type
                              </div>
                              <div className="text-white text-[13px] font-medium">
                                {wallet?.walletType || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-white/70 text-[10px] uppercase mb-1 tracking-wide">
                                Balance
                              </div>
                              <div className="text-white text-[13px] font-medium">
                                {balance.toFixed(2)} HBAR
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wallet Info & Cards - Right */}
          <div className="flex-1 flex items-center w-full gap-14 lg:w-auto">
            <div className="flex-1 flex-col">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-[var(--color-text-primary)] text-[16px] md:text-[18px] font-normal">
                  Crypto Wallet
                </h3>
              </div>

              <div>
                <div className="text-[var(--color-text-primary)] text-[42px] md:text-[52px] font-bold">
                  ${usdBalance.toFixed(2)}
                  <span className="text-[var(--color-text-muted)] text-[14px] md:text-[16px] ml-2 font-normal">
                    USD
                  </span>
                </div>
                <div className="text-[var(--color-text-muted)] text-[14px] md:text-[15px] mt-2">
                  {hbarBalance.toFixed(4)} HBAR
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${network === 'mainnet' ? 'bg-green-500' : 'bg-orange-500'}`}
                    ></div>
                    <span className="text-[var(--color-text-muted)] text-[12px] capitalize">
                      {network}
                    </span>
                  </div>
                  <div className="text-[var(--color-text-muted)] text-[12px]">
                    {wallets.length}{' '}
                    {wallets.length === 1 ? 'Wallet' : 'Wallets'} Connected
                  </div>
                </div>
              </div>
            </div>

            {/* Info Cards */}
            <div className="flex flex-col gap-3">
              <div className="bg-[var(--color-bg-hover)]/30 rounded-lg p-3 min-w-[140px]">
                <div className="text-[var(--color-text-muted)] text-[11px] mb-1">
                  HBAR Price
                </div>
                <div className="text-[var(--color-text-primary)] text-[15px] font-semibold">
                  ${hbarPrice?.toFixed(4) || '0.0000'}
                </div>
              </div>
              <div className="bg-[var(--color-bg-hover)]/30 rounded-lg p-3 min-w-[140px]">
                <div className="text-[var(--color-text-muted)] text-[11px] mb-1">
                  Network
                </div>
                <div className="text-[var(--color-text-primary)] text-[15px] font-semibold capitalize">
                  Hedera {network}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletSection;
