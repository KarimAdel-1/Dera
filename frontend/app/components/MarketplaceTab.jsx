import React from 'react';
import { Search, Folder, Rocket, Plus, MessageCircle } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveTab } from '../store/nftSlice';
import NFTExplore from './nft/NFTExplore';
import NFTCollections from './nft/NFTCollections';
import NFTLaunchpad from './nft/NFTLaunchpad';
import NFTCreate from './nft/NFTCreate';
import NFTMessages from './nft/NFTMessages';

const MarketplaceTab = () => {
  const dispatch = useDispatch();
  const { activeTab } = useSelector(state => state.nft);

  const nftTabs = [
    { id: 'explore', label: 'Explore', icon: Search },
    { id: 'collections', label: 'Collections', icon: Folder },
    { id: 'launchpad', label: 'Launchpad', icon: Rocket },
    { id: 'create', label: 'Create', icon: Plus },
    { id: 'messages', label: 'Messages', icon: MessageCircle }
  ];

  const handleNFTTabChange = (tabId) => {
    dispatch(setActiveTab(tabId));
  };

  const renderNFTContent = () => {
    switch (activeTab) {
      case 'collections':
        return <NFTCollections />;
      case 'launchpad':
        return <NFTLaunchpad />;
      case 'create':
        return <NFTCreate />;
      case 'messages':
        return <NFTMessages />;
      default:
        return <NFTExplore />;
    }
  };

  return (
    <div className="p-0 sm:p-0">
      <div className="space-y-6">
        {/* NFT Tabs */}
        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-2 border border-[var(--color-border-primary)]">
          <div className="flex gap-2">
            {nftTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNFTTabChange(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-shadow-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* NFT Content */}
        <div className="min-h-[400px] bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border-primary)] p-6">
          {renderNFTContent()}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceTab;