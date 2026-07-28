'use client';

import React from 'react';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';
import { Header } from '@/components/layout/Header';
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <QueryProvider>
      <Header />
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-8 py-8">{children}</main>
    </QueryProvider>
  );

  return (
    <html lang="en">
      <body className="bg-[#FAF8F5] text-[#1F1F1F] min-h-screen flex flex-col font-sans antialiased">
        {clerkPublishableKey ? (
          <ClerkProvider publishableKey={clerkPublishableKey}>
            {content}
          </ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
