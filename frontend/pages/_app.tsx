import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from '@/contexts/WalletContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  // Suppress HashConnect decryption errors globally
  useEffect(() => {
    // Store original console.error
    const originalError = console.error;

    // Override console.error to filter HashConnect decryption errors
    console.error = (...args: any[]) => {
      const errorString = args.join(' ');

      // Suppress specific HashConnect decryption errors
      if (
        errorString.includes('Invalid encrypted text received') ||
        errorString.includes('Decryption halted') ||
        errorString.includes('SimpleCrypto')
      ) {
        // Silently ignore these errors - polling will handle pairing
        return;
      }

      // Log all other errors normally
      originalError.apply(console, args);
    };

    // Add global error event listener
    const handleError = (event: ErrorEvent) => {
      if (
        event.message?.includes('Invalid encrypted text received') ||
        event.message?.includes('Decryption halted')
      ) {
        // Prevent error from showing in UI
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason);
      if (
        reason.includes('Invalid encrypted text received') ||
        reason.includes('Decryption halted')
      ) {
        // Prevent error from showing in UI
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <WalletProvider>
      <NotificationProvider>
        <Component {...pageProps} />
        <Toaster position="top-right" />
      </NotificationProvider>
    </WalletProvider>
  );
}
