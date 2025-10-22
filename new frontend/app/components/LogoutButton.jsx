'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const { disconnectAll } = useWallet();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      // Disconnect all wallets and clear HashPack connection
      await disconnectAll();

      // Redirect to connect page
      router.push('/connect');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, redirect to connect page
      router.push('/connect');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-red-500 text-white shadow-xs hover:bg-red-600 h-9 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <LogOut className="w-4 h-4" />
      {isLoggingOut ? 'Disconnecting...' : 'Disconnect Wallet'}
    </button>
  );
}
