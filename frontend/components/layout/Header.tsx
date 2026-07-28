'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getStoredUser, clearStoredUser, UserProfile, defaultUser } from '@/lib/auth';
import { LogOut, LogIn, Mail, Settings } from 'lucide-react';
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
    { name: 'Settings', href: '/settings' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#FAF8F5] border-b border-[#DDD8D1] w-full shadow-sm">
        <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 py-3 min-h-[64px] flex items-center justify-between font-sans gap-4">
          
          {/* FAR LEFT: MailOrchestrator Title + Subtitle */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0 py-1">
            <div className="w-8 h-8 rounded-lg bg-[#A34A22] text-white flex items-center justify-center shadow-sm group-hover:bg-[#8c3d1b] transition-colors shrink-0">
              <Mail className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col justify-center text-left">
              <span className="text-base font-bold text-[#1F1F1F] tracking-tight leading-tight group-hover:text-[#A34A22] transition-colors">
                Mail<span className="text-[#A34A22]">Orchestrator</span>
              </span>
              <span className="text-[11px] font-medium text-[#6B6B6B] leading-none mt-0.5 whitespace-nowrap">
                Internal Email Operations
              </span>
            </div>
          </Link>

          {/* CENTER: Navigation Links */}
          <nav className="flex items-center justify-center gap-2 lg:gap-3 px-2 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center text-xs font-semibold whitespace-nowrap transition-all px-3 py-1.5 rounded-md',
                    isActive
                      ? 'text-[#A34A22] bg-[#A34A22]/10 border border-[#A34A22]/30 shadow-2xs'
                      : 'text-[#6B6B6B] hover:text-[#1F1F1F] hover:bg-[#DDD8D1]/40'
                  )}
                >
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* FAR RIGHT: User Profile Badge & Quick Settings / Logout Links */}
          <div className="flex items-center gap-3 shrink-0">
            {isLoggedIn ? (
              <div className="flex items-center gap-2.5 bg-[#FFFFFF] border border-[#DDD8D1] rounded-full pl-2 pr-3 py-1 shadow-2xs hover:border-[#A34A22]/30 transition-colors">
                <div className="relative flex items-center justify-center">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#DDD8D1] object-cover shrink-0"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#1B7F4B] ring-2 ring-[#FAF8F5]" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-[#1F1F1F] text-xs leading-tight">{user.name}</div>
                  <div className="text-[10px] text-[#6B6B6B] font-mono leading-tight">{user.email}</div>
                </div>
                <Link
                  href="/settings"
                  title="Sender Settings"
                  className="p-1.5 rounded-full text-[#6B6B6B] hover:text-[#A34A22] hover:bg-[#A34A22]/10 transition-colors ml-0.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded-full text-[#6B6B6B] hover:text-[#B42318] hover:bg-[#B42318]/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#A34A22] hover:bg-[#8c3d1b] text-white text-xs font-semibold whitespace-nowrap transition-colors shadow-2xs"
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
