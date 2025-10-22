import React from 'react';
import Link from 'next/link';
import WalletConnect from './WalletConnect';

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            Dera
          </Link>

          <div className="hidden md:flex space-x-8">
            <Link href="/lend" className="text-gray-700 hover:text-primary-600">
              Lend
            </Link>
            <Link href="/borrow" className="text-gray-700 hover:text-primary-600">
              Borrow
            </Link>
            <Link href="/dashboard" className="text-gray-700 hover:text-primary-600">
              Dashboard
            </Link>
          </div>

          <WalletConnect />
        </div>
      </nav>
    </header>
  );
}
