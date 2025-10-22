import React from 'react';
import { User } from 'lucide-react';

const NFTCard = ({ nft }) => {
  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg overflow-hidden hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer">
      <div className="aspect-square bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/5 flex items-center justify-center">
        <div className="w-16 h-16 bg-[var(--color-primary)]/30 rounded-full flex items-center justify-center">
          <span className="text-[var(--color-primary)] text-lg font-bold">NFT</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-[var(--color-text-primary)] mb-2 truncate">{nft.name}</h3>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[var(--color-primary)] font-semibold">{nft.price} HBAR</span>
          <div className="flex items-center gap-1 text-[var(--color-text-muted)] text-sm">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{nft.owner}</span>
          </div>
        </div>
        <button className="w-full py-2 px-4 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary)]/90 transition-colors text-sm">
          View Details
        </button>
      </div>
    </div>
  );
};

export default NFTCard;