import React, { useState } from 'react';
import { Send, User, Image } from 'lucide-react';

const NFTMessages = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');

  const mockChats = [
    {
      id: 1,
      user: 'artist123',
      lastMessage: 'Interested in your NFT collection',
      time: '2 min ago',
      nft: 'Hedera Punk #1337',
      unread: 2
    },
    {
      id: 2,
      user: 'collector456',
      lastMessage: 'Can you do 200 HBAR?',
      time: '1 hour ago',
      nft: 'Digital Art #42',
      unread: 0
    },
    {
      id: 3,
      user: 'trader789',
      lastMessage: 'Thanks for the quick sale!',
      time: '1 day ago',
      nft: 'Music NFT #789',
      unread: 0
    }
  ];

  const mockMessages = [
    { id: 1, sender: 'artist123', text: 'Hi! I\'m interested in your NFT collection', time: '10:30 AM', isOwn: false },
    { id: 2, sender: 'me', text: 'Hello! Which piece are you interested in?', time: '10:32 AM', isOwn: true },
    { id: 3, sender: 'artist123', text: 'The Hedera Punk #1337. What\'s your best price?', time: '10:35 AM', isOwn: false },
    { id: 4, sender: 'me', text: 'I can do 180 HBAR for it', time: '10:40 AM', isOwn: true }
  ];

  const sendMessage = () => {
    if (message.trim()) {
      // Add message logic here
      setMessage('');
    }
  };

  return (
    <div className="flex h-[600px] bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg overflow-hidden">
      {/* Chat List */}
      <div className="w-1/3 border-r border-[var(--color-border-primary)]">
        <div className="p-4 border-b border-[var(--color-border-primary)]">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Messages</h3>
        </div>
        <div className="overflow-y-auto h-full">
          {mockChats.map(chat => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`p-4 border-b border-[var(--color-border-primary)] cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors ${
                selectedChat?.id === chat.id ? 'bg-[var(--color-bg-hover)]' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-[var(--color-text-primary)] text-sm truncate">
                      {chat.user}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">{chat.time}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] truncate mb-1">
                    {chat.lastMessage}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-primary)]">{chat.nft}</span>
                    {chat.unread > 0 && (
                      <span className="bg-[var(--color-primary)] text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <div>
                  <h4 className="font-medium text-[var(--color-text-primary)]">{selectedChat.user}</h4>
                  <p className="text-xs text-[var(--color-text-muted)]">About: {selectedChat.nft}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mockMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.isOwn 
                      ? 'bg-[var(--color-primary)] text-white' 
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                  }`}>
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.isOwn ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-[var(--color-border-primary)]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Image className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)]" />
              <h3 className="text-[var(--color-text-primary)] font-medium mb-2">Select a conversation</h3>
              <p className="text-[var(--color-text-muted)] text-sm">Choose a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTMessages;