import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { setSearchQuery, setFilters } from '../../store/nftSlice';
import NFTCard from '../NFTCard';


const NFTExplore = () => {
  const dispatch = useDispatch();
  const { searchQuery, filters, nfts } = useSelector(state => state.nft);

  const [showFilters, setShowFilters] = useState(false);

  const mockNFTs = [
    { id: 1, name: 'Hedera Punk #1337', price: '150', owner: 'user123', image: '/placeholder-nft.jpg' },
    { id: 2, name: 'Digital Art #42', price: '250', owner: 'artist456', image: '/placeholder-nft.jpg' },
    { id: 3, name: 'Music NFT #789', price: '100', owner: 'musician789', image: '/placeholder-nft.jpg' }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-[var(--color-primary)]">12.5K</div>
          <div className="text-sm text-[var(--color-text-muted)]">Total NFTs</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-500">2.8K</div>
          <div className="text-sm text-[var(--color-text-muted)]">Collections</div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-500">45.2K</div>
          <div className="text-sm text-[var(--color-text-muted)]">Volume (HBAR)</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-500">1.2K</div>
          <div className="text-sm text-[var(--color-text-muted)]">Active Users</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Search and Filters */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-primary)]" />
            <input
              type="text"
              placeholder="Search NFTs, collections, creators"
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              className="w-full pl-10 pr-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all ${
              showFilters 
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' 
                : 'bg-[var(--color-bg-card)] border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded text-sm">
                <option value="all">All Categories</option>
                <option value="art">Art</option>
                <option value="music">Music</option>
                <option value="pfps">PFPs</option>
                <option value="gaming">Gaming</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Blockchain</label>
              <select className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded text-sm">
                <option value="hedera">Hedera</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <select className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded text-sm">
                <option value="newest">Newest</option>
                <option value="trending">Trending</option>
                <option value="lowest-price">Lowest Price</option>
                <option value="highest-price">Highest Price</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* NFT Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mockNFTs.map(nft => (
          <NFTCard key={nft.id} />
        ))}
      </div>


    </div>
  );
};

export default NFTExplore;