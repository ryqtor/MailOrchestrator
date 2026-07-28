'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getStoredUser, clearStoredUser, setStoredUser, UserProfile, defaultUser } from '@/lib/auth';
import { LogOut, LogIn } from 'lucide-react';

import { GoogleLoginModal } from '../auth/GoogleLoginModal';

export function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
  }, []);

  const handleLogout = () => {
    clearStoredUser();
    setIsLoggedIn(false);
  };

  const handleAuthSuccess = (loggedUser: UserProfile) => {
    setUser(loggedUser);
    setIsLoggedIn(true);
  };

  const navItems = [
    { name: 'Operations', href: '/' },
    { name: 'Campaigns', href: '/compose' },
    { name: 'Execution Queue', href: '/emails/scheduled' },
    { name: 'Delivery Archive', href: '/emails/sent' },
    { name: 'Pipeline', href: '/metrics' },
  ];

  return (
    <>
      <header className="border-b border-[#DDD8D1] bg-[#FAF8F5] sticky top-0 z-40">
        {/* 3-Part Centered 1280px Layout with 76px Height */}
        <div className="max-w-[1280px] mx-auto px-8 h-[76px] flex items-center justify-between">
          
          {/* LEFT: Wordmark + Subtitle */}
          <div className="flex items-baseline gap-4">
            <Link
              href="/"
              className="font-serif text-[32px] font-semibold text-[#1F1F1F] leading-none tracking-tight hover:text-[#A34A22] transition-colors"
            >
              MailOrchestrator
            </Link>
            <span className="text-[13px] font-sans text-[#6B6B6B] tracking-normal font-normal hidden sm:inline">
              Internal Email Operations
            </span>
          </div>

          {/* CENTER: Plain Text Navigation Links */}
          <nav className="flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative py-6 text-[16px] font-sans font-medium transition-colors hover:text-[#1F1F1F]',
                    isActive ? 'text-[#A34A22] font-semibold' : 'text-[#6B6B6B]'
                  )}
                >
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#A34A22]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* RIGHT: User Profile & Google OAuth */}
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#DDD8D1]"
                />
                <div className="text-left text-xs hidden md:block">
                  <div className="font-semibold text-[#1F1F1F] text-[14px] leading-snug">{user.name}</div>
                  <div className="text-[13px] text-[#6B6B6B] font-mono leading-none">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded hover:bg-[#DDD8D1]/40 text-[#6B6B6B] hover:text-[#B42318] transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded bg-[#A34A22] hover:bg-[#8c3d1b] text-white text-xs font-semibold font-sans transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Google OAuth Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <GoogleLoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
