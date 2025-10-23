import { Wallet, Copy, Eye, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { setDefaultWalletInDB } from '../../../store/walletSlice'
import { toast } from 'react-hot-toast'

export default function WalletDetails({ 
  wallets, 
  activeWalletId, 
  walletsData, 
  hbarPrice, 
  walletDetails, 
  network, 
  refreshWalletDetails,
  setShowAssetsModal 
}) {
  const dispatch = useDispatch()
  const [showFullAddress, setShowFullAddress] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)

  const activeWallet = wallets.find((w) => w.id === activeWalletId)
  const walletData = activeWallet ? walletsData[activeWallet.address] : null
  const hbarBalance = parseFloat(walletData?.hbarBalance || '0')
  const usdBalance = hbarBalance * (hbarPrice || 0)
  const tokenBalances = walletData?.tokenBalances || []

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[var(--color-text-secondary)] text-[16px] sm:text-[18px] font-normal">
          Wallet Details
        </h3>
        <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-text-muted)]" />
      </div>
      
      <div className="bg-[var(--color-bg-tertiary)]/30 rounded-[16px] p-4 mb-6 border border-[var(--color-border-primary)]">
        <p className="text-[var(--color-text-muted)] text-[12px] sm:text-[13px] mb-1">
          Wallet Balance
        </p>
        <p className="text-[var(--color-text-primary)] text-[20px] sm:text-[24px] font-normal">
          {usdBalance > 0 ? `$${usdBalance.toFixed(2)}` : '$0.00'}
        </p>
        <p className="text-[var(--color-text-muted)] text-[10px] sm:text-[11px] mt-1">
          {walletData?.hbarBalance || '0'} HBAR
        </p>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-border-primary)]">
          <span className="text-[var(--color-text-muted)] text-[12px] sm:text-[13px]">
            Wallet Type
          </span>
          <span className="text-[var(--color-text-secondary)] text-[13px] sm:text-[14px] font-normal truncate ml-2">
            {activeWallet?.walletType || 'Connected'}
          </span>
        </div>
        
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-border-primary)]">
          <span className="text-[var(--color-text-muted)] text-[12px] sm:text-[13px]">
            Network
          </span>
          <span className="text-[var(--color-text-secondary)] text-[13px] sm:text-[14px] font-normal truncate ml-2">
            Hedera {walletDetails.network || network.charAt(0).toUpperCase() + network.slice(1)}
          </span>
        </div>
        
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-border-primary)]">
          <span className="text-[var(--color-text-muted)] text-[12px] sm:text-[13px]">
            Wallet Address
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-secondary)] text-[12px] sm:text-[14px] font-normal">
              {showFullAddress ? activeWallet?.address : '••••••••••••••••'}
            </span>
            <button
              onClick={() => {
                const addressToCopy = activeWallet?.address
                navigator.clipboard.writeText(addressToCopy)
                setCopiedAddress(true)
                setTimeout(() => setCopiedAddress(false), 2000)
                toast.success('Address copied to clipboard!')
              }}
              className="inline-flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] rounded-md p-1 h-auto min-h-0 transition-colors"
            >
              <Copy className={`w-3 h-3 ${copiedAddress ? 'text-green-400' : 'text-[var(--color-text-muted)]'}`} />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-border-primary)]">
          <span className="text-[var(--color-text-muted)] text-[12px] sm:text-[13px]">
            HBAR Balance
          </span>
          <span className="text-[var(--color-text-secondary)] text-[13px] sm:text-[14px] font-normal truncate ml-2">
            {walletData?.hbarBalance || '0'} HBAR
          </span>
        </div>
        
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-border-primary)]">
          <span className="text-[var(--color-text-muted)] text-[12px] sm:text-[13px]">
            Status
          </span>
          <div className="flex gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors bg-green-500/20 text-green-400 border-green-500/30 px-2 py-1 text-xs">
              {walletDetails.isLoading ? 'Loading' : 'Active'}
            </div>
            {activeWallet?.isDefault && (
              <div className="inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors bg-blue-500/20 text-blue-400 border-blue-500/30 px-2 py-1 text-xs">
                Default
              </div>
            )}
          </div>
        </div>
      </div>
      
      {tokenBalances.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[var(--color-text-secondary)] text-[14px] font-medium">
              Assets ({tokenBalances.length})
            </h4>
            <button
              onClick={() => setShowAssetsModal(true)}
              className="text-[var(--color-primary)] text-[12px] hover:underline"
            >
              View All
            </button>
          </div>
          <button
            onClick={() => setShowAssetsModal(true)}
            className="w-full p-3 bg-[var(--color-bg-tertiary)]/20 rounded-lg border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-tertiary)]/30 transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-primary)] text-[13px] font-medium">
                View Assets
              </span>
              <span className="text-[var(--color-text-muted)] text-[11px]">
                {tokenBalances.length} items →
              </span>
            </div>
          </button>
        </div>
      )}
      
      <div className="space-y-3 mt-6">
        {!activeWallet?.isDefault && (
          <button
            onClick={() => dispatch(setDefaultWalletInDB(activeWalletId))}
            className="whitespace-nowrap rounded-md text-sm font-medium transition-all border border-[var(--color-border-primary)] bg-[var(--color-primary)] text-white shadow-xs hover:bg-[var(--color-primary)]/90 h-9 px-4 py-2 w-full flex items-center justify-center gap-2"
          >
            <span className="text-[13px] sm:text-[14px]">Set as Default</span>
          </button>
        )}
        
        <button
          onClick={() => setShowFullAddress(!showFullAddress)}
          className="whitespace-nowrap rounded-md text-sm font-medium transition-all border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-xs hover:bg-[var(--color-bg-card)]/70 h-9 px-4 py-2 w-full flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          <span className="text-[13px] sm:text-[14px]">
            {showFullAddress ? 'Hide Full Address' : 'Show Full Address'}
          </span>
        </button>
        
        <button
          onClick={refreshWalletDetails}
          disabled={walletDetails.isLoading}
          className="whitespace-nowrap rounded-md text-sm font-medium transition-all border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-xs hover:bg-[var(--color-bg-card)]/70 h-9 px-4 py-2 w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-[13px] sm:text-[14px]">
            {walletDetails.isLoading ? 'Refreshing...' : 'Refresh Balance'}
          </span>
        </button>
      </div>
    </div>
  )
}