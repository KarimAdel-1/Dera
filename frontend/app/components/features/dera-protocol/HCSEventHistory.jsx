'use client';

import { useState, useEffect } from 'react';
import deraProtocolService from '../../../../services/deraProtocolServiceV2';

export default function HCSEventHistory() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEvents();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, selectedFilter, searchTerm]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const allEvents = await deraProtocolService.getAllProtocolEvents(20);
      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    // Filter by type
    if (selectedFilter !== 'ALL') {
      filtered = filtered.filter((event) => event.type === selectedFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.data?.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.data?.asset?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  };

  const eventTypes = [
    { id: 'ALL', label: 'All Events', icon: '📋', color: 'text-text-primary' },
    { id: 'SUPPLY', label: 'Supply', icon: '💰', color: 'text-green-500' },
    { id: 'WITHDRAW', label: 'Withdraw', icon: '💸', color: 'text-blue-500' },
    { id: 'BORROW', label: 'Borrow', icon: '🏦', color: 'text-yellow-500' },
    { id: 'REPAY', label: 'Repay', icon: '✅', color: 'text-purple-500' },
  ];

  const getEventIcon = (type) => {
    const eventType = eventTypes.find((t) => t.id === type);
    return eventType?.icon || '📋';
  };

  const getEventColor = (type) => {
    const eventType = eventTypes.find((t) => t.id === type);
    return eventType?.color || 'text-text-primary';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.substring(0, 10)}...${address.substring(address.length - 6)}`;
  };

  const formatAmount = (amount) => {
    if (!amount) return '0';
    const num = parseFloat(amount) / 1e8; // Assuming 8 decimals
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-[var(--color-text-primary)] text-[16px] sm:text-[18px] font-normal mb-2">HCS Event History</h3>
        <p className="text-[13px] sm:text-[14px] text-[var(--color-text-muted)]">
          Immutable audit trail powered by Hedera Consensus Service
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-[var(--color-primary)]/10 border-l-4 border-[var(--color-primary)] rounded-[12px] p-4">
        <div className="flex items-start gap-4">
          <div className="text-3xl">⚡</div>
          <div>
            <h3 className="font-medium text-[var(--color-text-primary)] text-[14px] mb-2">
              What is HCS Event Streaming?
            </h3>
            <p className="text-[13px] text-[var(--color-text-muted)] mb-3">
              Every transaction on Dera Protocol is streamed to the Hedera Consensus Service (HCS),
              creating an immutable, consensus-timestamped audit trail. This data is queryable via
              Hedera Mirror Nodes without needing a custom indexer.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]">
              <div className="flex items-start gap-2">
                <span className="text-[var(--color-primary)]">✓</span>
                <span className="text-[var(--color-text-muted)]">Consensus timestamped</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--color-primary)]">✓</span>
                <span className="text-[var(--color-text-muted)]">Immutable & tamper-proof</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--color-primary)]">✓</span>
                <span className="text-[var(--color-text-muted)]">No custom indexer needed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Type Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {eventTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedFilter(type.id)}
              className={`px-4 py-2 rounded-[12px] font-medium whitespace-nowrap transition-colors ${
                selectedFilter === type.id
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-secondary)]'
              }`}
            >
              <span className="mr-2">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by transaction ID, user, or asset..."
            className="w-full px-4 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      {/* Events List */}
      <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
              <p className="text-[var(--color-text-muted)]">Loading events from HCS...</p>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-[var(--color-text-muted)]">No events found</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-secondary)]">
            {filteredEvents.map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className="p-4 hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Event Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center text-xl ${getEventColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${getEventColor(event.type)}`}>
                          {event.type}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Seq #{event.sequenceNumber}
                      </span>
                    </div>

                    {/* Event Data */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
                      {event.data?.user && (
                        <div>
                          <span className="text-[var(--color-text-muted)]">User: </span>
                          <span className="text-[var(--color-text-primary)] font-mono">
                            {formatAddress(event.data.user)}
                          </span>
                        </div>
                      )}
                      {event.data?.asset && (
                        <div>
                          <span className="text-[var(--color-text-muted)]">Asset: </span>
                          <span className="text-[var(--color-text-primary)] font-mono">
                            {formatAddress(event.data.asset)}
                          </span>
                        </div>
                      )}
                      {event.data?.amount && (
                        <div>
                          <span className="text-[var(--color-text-muted)]">Amount: </span>
                          <span className="text-[var(--color-text-primary)] font-medium">
                            {formatAmount(event.data.amount)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Transaction ID */}
                    {event.transactionId !== 'N/A' && (
                      <div className="mt-2 text-xs">
                        <span className="text-[var(--color-text-muted)]">TX: </span>
                        <span className="text-[var(--color-text-primary)] font-mono">
                          {event.transactionId}
                        </span>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>

                  {/* View on Mirror Node */}
                  <button
                    onClick={() => {
                      // Map event type to correct topic
                      const topicMap = {
                        'SUPPLY': deraProtocolService.topics.SUPPLY,
                        'WITHDRAW': deraProtocolService.topics.WITHDRAW,
                        'BORROW': deraProtocolService.topics.BORROW,
                        'REPAY': deraProtocolService.topics.REPAY,
                        'LIQUIDATION': deraProtocolService.topics.LIQUIDATION,
                      };
                      const topicId = topicMap[event.type] || deraProtocolService.topics.SUPPLY;
                      const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
                      const mirrorNodeUrl = `https://hashscan.io/${network}/topic/${topicId}/message/${event.sequenceNumber}`;
                      window.open(mirrorNodeUrl, '_blank');
                    }}
                    className="flex-shrink-0 px-3 py-1 text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded hover:bg-[var(--color-primary)]/20 transition-colors"
                  >
                    View on HashScan →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {!loading && filteredEvents.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] text-[13px]">
          <span className="text-[var(--color-text-muted)]">
            Showing {filteredEvents.length} event{filteredEvents.length !== 1 && 's'}
          </span>
          <button
            onClick={loadEvents}
            className="text-[var(--color-primary)] hover:underline flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
