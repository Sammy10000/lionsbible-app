import type { Metadata } from "next";
import { Comfortaa } from "next/font/google";
import "./globals.css";

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lions Bible",
  description: "A Progressive Web App for Bible study and community engagement on lionsbible.com.",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <title>Lions Bible</title>
        <meta name="description" content="A Progressive Web App for Bible study and community engagement on lionsbible.com." />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={`${comfortaa.variable} antialiased bg-base-100 text-base-content`}>
        {children}
      </body>
    </html>
  );
}