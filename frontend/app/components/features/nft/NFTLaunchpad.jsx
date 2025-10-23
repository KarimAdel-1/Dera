import React from 'react';
import { Calendar, Users, Coins } from 'lucide-react';

const NFTLaunchpad = () => {
  const mockLaunches = [
    {
      id: 1,
      name: 'Future Punks',
      mintDate: '2024-02-15',
      supply: 5000,
      mintPrice: '75',
      status: 'upcoming'
    },
    {
      id: 2,
      name: 'Hedera Heroes',
      mintDate: '2024-02-10',
      supply: 3000,
      mintPrice: '50',
      status: 'live'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Featured Launch */}
      <div className="relative bg-gradient-to-br from-[var(--color-primary)]/20 via-purple-500/10 to-blue-500/20 border border-[var(--color-primary)]/30 rounded-2xl p-8 overflow-hidden">
        <div className="absolute top-4 right-4 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-4 left-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
        
        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-4 py-2 rounded-full text-sm font-medium mb-4">
              🔥 Featured Launch
            </div>
            <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">Future Punks Collection</h2>
            <p className="text-[var(--color-text-muted)] text-lg">The next generation of digital collectibles on Hedera</p>
          </div>
          
          <div className="bg-[var(--color-bg-card)]/80 backdrop-blur-sm rounded-xl p-6 border border-[var(--color-border-primary)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="bg-[var(--color-primary)]/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-[var(--color-primary)]" />
                </div>
                <div className="text-sm text-[var(--color-text-muted)] mb-1">Launch Date</div>
                <div className="font-semibold text-[var(--color-text-primary)]">Feb 15, 2024</div>
              </div>
              <div className="text-center">
                <div className="bg-blue-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-sm text-[var(--color-text-muted)] mb-1">Total Supply</div>
                <div className="font-semibold text-[var(--color-text-primary)]">5,000 NFTs</div>
              </div>
              <div className="text-center">
                <div className="bg-green-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Coins className="w-6 h-6 text-green-500" />
                </div>
                <div className="text-sm text-[var(--color-text-muted)] mb-1">Mint Price</div>
                <div className="font-semibold text-green-500">75 HBAR</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-all hover:scale-105 font-medium shadow-lg shadow-[var(--color-primary)]/25">
                Join Whitelist
              </button>
              <button className="px-8 py-3 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors font-medium">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Launches */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">Upcoming Launches</h3>
          <div className="bg-gradient-to-r from-[var(--color-primary)] to-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            {mockLaunches.length} Active
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockLaunches.map((launch, index) => {
            const gradients = [
              'from-purple-500 to-pink-500',
              'from-blue-500 to-cyan-500'
            ];
            
            return (
              <div key={launch.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-xl overflow-hidden hover:shadow-xl hover:shadow-[var(--color-primary)]/10 transition-all duration-300 group">
                <div className={`h-40 bg-gradient-to-br ${gradients[index]} relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-xl drop-shadow-lg">{launch.name}</span>
                  </div>
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${
                    launch.status === 'live' 
                      ? 'bg-green-500 text-white animate-pulse' 
                      : 'bg-yellow-500 text-black'
                  }`}>
                    {launch.status === 'live' ? '• LIVE' : 'UPCOMING'}
                  </div>
                </div>
                
                <div className="p-6">
                  <h4 className="font-bold text-[var(--color-text-primary)] mb-4 text-lg group-hover:text-[var(--color-primary)] transition-colors">{launch.name}</h4>
                  
                  <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--color-text-muted)] flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Mint Date:
                      </span>
                      <span className="text-[var(--color-text-primary)] font-medium">{launch.mintDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--color-text-muted)] flex items-center gap-2">
                        <Users className="w-4 h-4" /> Supply:
                      </span>
                      <span className="text-[var(--color-text-primary)] font-medium">{launch.supply.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--color-text-muted)] flex items-center gap-2">
                        <Coins className="w-4 h-4" /> Price:
                      </span>
                      <span className="text-[var(--color-primary)] font-semibold">{launch.mintPrice} HBAR</span>
                    </div>
                  </div>
                  
                  <button className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                    launch.status === 'live' 
                      ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 hover:scale-105 shadow-lg shadow-[var(--color-primary)]/25' 
                      : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white border border-[var(--color-primary)]/20'
                  }`}>
                    {launch.status === 'live' ? '🚀 Mint Now' : '📝 Join Whitelist'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NFTLaunchpad;