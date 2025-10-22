import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from '@/contexts/WalletContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletProvider>
      <NotificationProvider>
        <Component {...pageProps} />
        <Toaster position="top-right" />
      </NotificationProvider>
    </WalletProvider>
  );
}
