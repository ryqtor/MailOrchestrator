'use client';

import React from 'react';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';
import { Header } from '@/components/layout/Header';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#FAF8F5] text-[#1F1F1F] min-h-screen flex flex-col font-sans antialiased">
        <QueryProvider>
          <Header />
          <main className="flex-1 max-w-[1280px] w-full mx-auto px-8 py-8">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
