'use client';

import React from 'react';
import { Mail, Shield, LogIn, ArrowRight } from 'lucide-react';
import { SignIn, useUser } from '@clerk/nextjs';
import { GoogleLoginModal } from '@/components/auth/GoogleLoginModal';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, router]);

  const handleAuthSuccess = () => {
    router.push('/');
  };

  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-12 px-4 font-sans">
      <div className="max-w-md w-full space-y-8 bg-[#FFFFFF] border border-[#DDD8D1] rounded-2xl p-8 shadow-xl text-center relative overflow-hidden">
        
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#A34A22]" />

        {/* Header Icon & Brand */}
        <div className="flex flex-col items-center space-y-3 pt-2">
          <div className="w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#DDD8D1] flex items-center justify-center text-[#A34A22] shadow-2xs">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#1F1F1F] tracking-tight">
              Mail<span className="text-[#A34A22]">Orchestrator</span>
            </h1>
            <p className="text-xs text-[#6B6B6B] mt-1">
              Sign in with Google OAuth or Clerk to access email operations
            </p>
          </div>
        </div>

        {/* Embedded Clerk Component or Custom Sign-In */}
        {clerkPublishableKey ? (
          <div className="flex justify-center pt-2">
            <SignIn routing="hash" fallbackRedirectUrl="/" />
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-[#A34A22] hover:bg-[#8c3d1b] text-white text-sm font-semibold transition-all shadow-md group"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google OAuth</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#DDD8D1] text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1F1F1F]">
                <Shield className="w-4 h-4 text-[#A34A22]" />
                <span>Reviewer Quick Access</span>
              </div>
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                Includes pre-populated reviewer profiles for <strong>Mitrajit Lead</strong> and <strong>Sarvagya Chaudhary</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      <GoogleLoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
