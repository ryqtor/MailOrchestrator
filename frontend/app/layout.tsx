'use client';

import React from 'react';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';
import { Header } from '@/components/layout/Header';
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    'pk_test_Y2xlcmsuaW5jbHVkZWQuY2xlcmsuYWNjb3VudHMuZGV2JA';

  return (
    <html lang="en">
      <head>
        <title>MailOrchestrator - Cold Email Scheduler</title>
        <link rel="icon" href="https://img.icons8.com/fluent/1200/composing-mail.jpg" />
        <link rel="shortcut icon" href="https://img.icons8.com/fluent/1200/composing-mail.jpg" />
        <meta name="description" content="Production-grade BullMQ email job scheduler and operations console" />
      </head>
      <body className="bg-[#FAF8F5] text-[#1F1F1F] min-h-screen flex flex-col font-sans antialiased">
        <ClerkProvider publishableKey={clerkPublishableKey}>
          <QueryProvider>
            <Header />
            <main className="flex-1 max-w-[1280px] w-full mx-auto px-8 py-8">{children}</main>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
