import { Wallet, Edit3, Plug } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { switchWallet } from '../../../store/walletSlice'

export default function WalletCard({ wallet, activeWalletId, walletsData, hbarPrice, network, onEdit, onReconnect }) {
  const dispatch = useDispatch()

  const handleReconnect = async (e) => {
    e.stopPropagation()
    if (onReconnect) {
      await onReconnect(wallet)
    }
  }

  const formatAddress = (addr) => {
    if (!addr) return 'Not Connected'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const walletData = walletsData[wallet.address]
  const hbarBalance = parseFloat(walletData?.hbarBalance || '0')
  const usdBalance = hbarBalance * (hbarPrice || 0)

  return (
    <div
      className={`bg-[var(--color-bg-secondary)] rounded-[20px] border p-4 sm:p-6 cursor-pointer transition-all hover:bg-[var(--color-bg-secondary)]/40 relative ${
        wallet.id === activeWalletId
          ? 'border-[var(--color-primary)]'
          : 'border-[var(--color-border-primary)]'
      }`}
      onClick={() => dispatch(switchWallet(wallet.id))}
    >
      <div className="absolute top-4 right-4 flex gap-2">
        {wallet.isActive === false && (
          <button
            onClick={handleReconnect}
            className="w-8 h-8 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition-colors"
            title="Reconnect wallet"
          >
            <Plug className="w-4 h-4 text-white" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(wallet)
          }}
          className="w-8 h-8 bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-full flex items-center justify-center transition-colors border border-[var(--color-border-primary)]"
        >
          <Edit3 className="w-4 h-4 text-[var(--color-text-primary)]" />
        </button>
      </div>
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6">
        <div className="w-full lg:w-auto flex justify-center lg:justify-start">
          <div
            className="w-[250px] md:w-[280px] h-[180px] rounded-[16px] overflow-hidden relative select-none transition-all duration-300"
            style={{
              backgroundImage: `url(/assets/cards/${wallet.cardSkin || 'Card-1.png'})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: 'rgba(0, 0, 0, 0.4) 0px 20px 35px -10px, rgba(0, 0, 0, 0.2) 0px 8px 15px -5px',
            }}
          >
            <div className="px-6 py-5 h-full flex flex-col justify-between text-white relative">
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
                {formatAddress(wallet.address)}
              </div>
              <div className="flex justify-start items-end mt-auto gap-4">
                <div>
                  <div className="text-white/70 text-[10px] uppercase mb-1 tracking-wide">
                    Wallet Type
                  </div>
                  <div className="text-white text-[13px] font-medium">
                    {wallet.walletType}
                  </div>
                </div>
                <div>
                  <div className="text-white/70 text-[10px] uppercase mb-1 tracking-wide">
                    Status
                  </div>
                  <div className="text-white text-[13px] font-medium">
                    {wallet.isActive === false ? 'Disconnected' : wallet.id === activeWalletId ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-[var(--color-text-primary)] text-[16px] sm:text-[18px] font-normal">
                {wallet.walletType} Wallet
              </h3>
              <div className="flex gap-2">
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors px-2 py-1 text-xs ${
                    wallet.isActive === false
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : wallet.id === activeWalletId
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                  }`}
                >
                  {wallet.isActive === false ? 'Disconnected' : wallet.id === activeWalletId ? 'Active' : 'Inactive'}
                </div>
                {wallet.isDefault && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors px-2 py-1 text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Default
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <span className="text-[var(--color-text-muted)] text-[12px] sm:text-[13px] block mb-1">
                Balance
              </span>
              <span className="text-[var(--color-text-primary)] text-[14px] sm:text-[16px] font-normal">
                {usdBalance > 0 ? `$${usdBalance.toFixed(2)}` : '$0.00'}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)] text-[12px] sm:text-[13px] block mb-1">
                Address
              </span>
              <span className="text-[var(--color-text-secondary)] text-[12px] sm:text-[13px]">
                {formatAddress(wallet.address)}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)] text-[12px] sm:text-[13px] block mb-1">
                Network
              </span>
              <span className="text-[var(--color-text-secondary)] text-[12px] sm:text-[13px]">
                Hedera {network.charAt(0).toUpperCase() + network.slice(1)}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)] text-[12px] sm:text-[13px] block mb-1">
                Connected
              </span>
              <span className="text-[var(--color-text-secondary)] text-[12px] sm:text-[13px] truncate">
                {new Date(wallet.connectedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}