import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ReachInbox - Production Email Scheduler',
  description: 'AI-driven production email scheduling service and queue dashboard',
};

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '524611453858-4v6egr9k7ma8lu36dv8gfmtihukmigtk.apps.googleusercontent.com';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#fff',
                borderRadius: '16px',
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)',
              },
              success: {
                iconTheme: {
                  primary: '#00b050',
                  secondary: '#fff',
                },
                style: {
                  border: '1px solid rgba(0, 176, 80, 0.3)',
                },
              },
              error: {
                iconTheme: {
                  primary: '#f43f5e',
                  secondary: '#fff',
                },
                style: {
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                },
              },
            }}
          />
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
