import React from 'react';
import { Folder } from 'lucide-react';

const NFTCollections = () => {
  const mockCollections = [
    { id: 1, name: 'Hedera Punks', nftCount: 10000, floorPrice: '50', volume: '15000' },
    { id: 2, name: 'Digital Artists', nftCount: 5000, floorPrice: '25', volume: '8000' },
    { id: 3, name: 'Music Collection', nftCount: 2500, floorPrice: '100', volume: '12000' }
  ];

  const gradients = [
    'from-[var(--color-primary)] to-red-500',
    'from-blue-500 to-purple-500', 
    'from-green-500 to-teal-500'
  ];

  return (
    <div className="space-y-6">
      {/* Top Collections Header */}
      <div className="bg-gradient-to-r from-[var(--color-primary)]/10 to-blue-500/10 rounded-xl p-6 border border-[var(--color-primary)]/20">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Top Collections</h2>
        <p className="text-[var(--color-text-muted)]">Discover the most popular NFT collections on Hedera</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCollections.map((collection, index) => (
          <div key={collection.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-xl overflow-hidden hover:border-[var(--color-primary)]/50 hover:shadow-lg hover:shadow-[var(--color-primary)]/10 transition-all duration-300 cursor-pointer group">
            <div className={`h-48 bg-gradient-to-br ${gradients[index]} flex items-center justify-center relative overflow-hidden`}>
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
              <Folder className="w-16 h-16 text-white relative z-10 group-hover:scale-110 transition-transform" />
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-xs font-medium">
                #{index + 1}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-3 group-hover:text-[var(--color-primary)] transition-colors">{collection.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Items:</span>
                  <span className="text-[var(--color-text-primary)] font-medium">{collection.nftCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Floor:</span>
                  <span className="text-[var(--color-primary)] font-semibold">{collection.floorPrice} HBAR</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Volume:</span>
                  <span className="text-green-500 font-medium">{collection.volume} HBAR</span>
                </div>
              </div>
              <button className="w-full mt-4 py-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-all font-medium">
                View Collection
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NFTCollections;