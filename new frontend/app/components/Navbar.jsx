'use client'

import Link from 'next/link'
import { useSelector } from 'react-redux'

export default function Navbar() {
  const { isConnected, address } = useSelector((state) => state.wallet)

  return (
    <nav className="bg-bg-secondary border-b border-border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-text-primary">
              Dera
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-text-secondary hover:text-text-primary px-3 py-2 rounded-md">
              Home
            </Link>
            <Link href="/dashboard" className="text-text-secondary hover:text-text-primary px-3 py-2 rounded-md">
              Dashboard
            </Link>
            
            {isConnected ? (
              <div className="text-text-muted text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            ) : (
              <Link href="/connect" className="bg-bg-tertiary hover:bg-bg-hover text-text-primary px-4 py-2 rounded-md border border-border-secondary">
                Connect Wallet
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}