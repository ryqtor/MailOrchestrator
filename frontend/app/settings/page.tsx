'use client';

import React from 'react';
import { Settings, ShieldCheck, Mail, Server } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">System Settings & Sender Configuration</h1>
        <p className="text-xs text-slate-400">Configure SMTP credentials, rate limits, and authentication defaults</p>
      </div>

      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-lg space-y-6">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Default SMTP Sender Profile</h2>
            <p className="text-xs text-slate-400">Default transport engine for outbound campaign dispatches</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Sender Name</label>
            <input
              type="text"
              readOnly
              value="Default Ethereal Engine"
              className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-white font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">From Email Address</label>
            <input
              type="text"
              readOnly
              value="orchestrator@ethereal.email"
              className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-white font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Hourly Rate Limit</label>
            <input
              type="text"
              readOnly
              value="500 emails / hour"
              className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-white font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Transport Mode</label>
            <input
              type="text"
              readOnly
              value="Ethereal Auto-Test Sandbox"
              className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-emerald-400 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-lg space-y-4">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2.5 rounded-xl bg-accent-cyan/10 text-accent-cyan">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Authentication & Security Tokens</h2>
            <p className="text-xs text-slate-400">JWT cookies, CORS policies, and rate limits</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-border/40">
            <div>
              <span className="font-semibold text-white block">Google OAuth Provider</span>
              <span className="text-[11px] text-slate-400">JWT Session Cookie Enabled</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold">Active</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-border/40">
            <div>
              <span className="font-semibold text-white block">API Express Rate Limiter</span>
              <span className="text-[11px] text-slate-400">500 requests per 15-minute window</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
