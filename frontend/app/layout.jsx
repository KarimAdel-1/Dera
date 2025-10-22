import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Dera App',
  description: 'Web3 application with wallet connectivity',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0d0d0d',
                color: '#fff',
                border: '1px solid #404040',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
