'use client';

import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { HashConnectButton } from './HashConnectClient';
import { useEffect } from 'react';

export function AuthButton() {
  const router = useRouter();
  const { wallets } = useSelector((state) => state.wallet);

  // Check if user has connected wallets
  const isConnected = wallets && wallets.length > 0;

  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [isConnected, router]);

  return (
    <div className="space-y-3">
      <HashConnectButton />
    </div>
  );
}
