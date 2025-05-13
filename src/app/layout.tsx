import type { Metadata } from 'next';
import { Comfortaa } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import ThemeWrapper from '@/components/ThemeWrapper';

const comfortaa = Comfortaa({
  variable: '--font-comfortaa',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Lions Bible',
  description: 'A Progressive Web App for Bible study and community engagement on lionsbible.com.',
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
          <Header />
          <div className="flex flex-1">
            <main className="flex-1">{children}</main>
          </div>
        </ThemeWrapper>
      </body>
    </html>
  );
}