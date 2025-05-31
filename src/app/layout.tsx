// app/layout.tsx
import { Comfortaa } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import ThemeWrapper from '@/components/ThemeWrapper';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { Metadata, Viewport } from 'next';

const comfortaa = Comfortaa({
  variable: '--font-comfortaa',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Lions Bible',
  description: 'A Progressive Web App for Bible study and community engagement on lionsbible.com.',
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={`${comfortaa.variable} antialiased bg-base-100 text-base-content flex flex-col min-h-screen`}>
        <ThemeWrapper>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            closeOnClick
            pauseOnHover={false}
            pauseOnFocusLoss={false}
            theme="light"
            limit={1}
          />
          <Header />
          <div className="flex flex-1">
            <main className="flex-1">{children}</main>
          </div>
        </ThemeWrapper>
      </body>
    </html>
  );
}