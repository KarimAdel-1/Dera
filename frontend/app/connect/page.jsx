'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AuthButton } from '../components/auth/AuthButton';

export default function ConnectWalletPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-pink-900/20"></div>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-border-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-primary) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        ></div>
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-secondary)] rounded-xl p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-2xl mb-4 shadow-lg">
              <div className="w-10 h-10 relative">
                <Image
                  src="/dera-logo--white.png"
                  alt="Dera logo"
                  fill={false}
                  width={40}
                  height={40}
                  className="object-contain"
                  style={{ height: 'auto' }}
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              Connect Wallet
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm">
              Choose your preferred wallet to continue
            </p>
          </div>

          <div className="flex justify-center">
            <AuthButton />
          </div>

          <div className="mt-6">{/* <ReconnectHelper /> */}</div>

          <div className="mt-6 text-center">
            <p className="text-[var(--color-text-muted)] text-xs">
              Securely connect using your preferred wallet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
