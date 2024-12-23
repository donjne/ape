// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientProvider from './providers';
import { Toaster } from "@/components/ui/toaster";
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SwiftApe',
  description: 'Trade new tokens instantly',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <ClientProvider>
        <body className={inter.className}>
          {children}
          <Toaster />
        </body>
      </ClientProvider>
    </html>
  );
}