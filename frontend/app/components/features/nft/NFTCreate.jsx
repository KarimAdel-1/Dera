import React, { useState } from 'react';
import { Upload, Plus, Minus, ArrowLeft, Image, Folder } from 'lucide-react';

const NFTCreate = () => {
  const [selectedView, setSelectedView] = useState(null);
  const [attributes, setAttributes] = useState([{ name: '', value: '' }]);

  const addAttribute = () => {
    setAttributes([...attributes, { name: '', value: '' }]);
  };

  const removeAttribute = (index) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const updateAttribute = (index, field, value) => {
    const updated = [...attributes];
    updated[index][field] = value;
    setAttributes(updated);
  };

  if (selectedView === 'mint-nft') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setSelectedView(null)}
            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Mint NFT</h2>
        </div>
        
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Upload Media</label>
            <div className="border-2 border-dashed border-[var(--color-border-primary)] rounded-lg p-8 text-center hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
              <p className="text-[var(--color-text-muted)]">Click to upload or drag and drop</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">PNG, JPG, GIF, MP4 (Max 100MB)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">NFT Name</label>
              <input
                type="text"
                placeholder="Enter NFT name"
                className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Collection</label>
              <select className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg">
                <option>Select Collection</option>
                <option>My Collection 1</option>
                <option>My Collection 2</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              rows={4}
              placeholder="Describe your NFT"
              className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium">Attributes</label>
              <button
                onClick={addAttribute}
                className="flex items-center gap-1 text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Attribute
              </button>
            </div>
            <div className="space-y-3">
              {attributes.map((attr, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Trait name"
                    value={attr.name}
                    onChange={(e) => updateAttribute(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={attr.value}
                    onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg"
                  />
                  <button
                    onClick={() => removeAttribute(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Price (HBAR)</label>
              <input
                type="number"
                placeholder="0"
                className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Royalty (%)</label>
              <input
                type="number"
                placeholder="0-10"
                max="10"
                className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button className="flex-1 py-3 px-6 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors">
              Mint NFT
            </button>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">List for Sale</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (selectedView === 'create-collection') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setSelectedView(null)}
            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Create Collection</h2>
        </div>
        
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Collection Banner</label>
            <div className="border-2 border-dashed border-[var(--color-border-primary)] rounded-lg p-8 text-center hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
              <p className="text-[var(--color-text-muted)]">Upload collection banner</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Collection Name</label>
              <input
                type="text"
                placeholder="Enter collection name"
                className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Royalty (%)</label>
              <input
                type="number"
                placeholder="0-10"
                max="10"
                className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              rows={4}
              placeholder="Describe your collection"
              className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg"
            />
          </div>

          <button className="w-full py-3 px-6 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors">
            Create Collection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div 
          onClick={() => setSelectedView('mint-nft')}
          className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg p-6 cursor-pointer hover:border-[var(--color-primary)]/50 transition-colors"
        >
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/5 rounded-lg flex items-center justify-center">
              <Image className="w-10 h-10 text-[var(--color-primary)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Mint NFT</h3>
            <p className="text-[var(--color-text-muted)] text-sm">Create and mint a single NFT with custom attributes and pricing</p>
          </div>
        </div>

        <div 
          onClick={() => setSelectedView('create-collection')}
          className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg p-6 cursor-pointer hover:border-[var(--color-primary)]/50 transition-colors"
        >
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/5 rounded-lg flex items-center justify-center">
              <Folder className="w-10 h-10 text-[var(--color-primary)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Create Collection</h3>
            <p className="text-[var(--color-text-muted)] text-sm">Set up a new NFT collection for multiple mints with shared branding</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTCreate;