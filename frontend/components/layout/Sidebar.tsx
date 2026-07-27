'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Send,
  Clock,
  CheckCircle2,
  Activity,
  Settings,
  Mail,
  Zap,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Send },
  { name: 'Scheduled', href: '/emails/scheduled', icon: Clock },
  { name: 'Sent History', href: '/emails/sent', icon: CheckCircle2 },
  { name: 'Queue & Metrics', href: '/metrics', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-card border-r border-border/60 flex flex-col fixed left-0 top-0 z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-border/60 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-accent-cyan flex items-center justify-center text-white shadow-md shadow-primary-500/20">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-white tracking-tight leading-none">MailOrchestrator</h1>
          <span className="text-[10px] text-slate-400 font-mono tracking-wider">v2.0 • Microservice</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-card-hover'
              )}
            >
              <item.icon className={cn('w-4 h-4', isActive ? 'text-primary-400' : 'text-slate-400')} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Worker System Status Footer */}
      <div className="p-4 m-3 rounded-xl bg-slate-900/80 border border-border/60">
        <div className="flex items-center gap-2 mb-1.5">
          <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-200">BullMQ Engine</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Worker Cluster</span>
          <span className="text-emerald-400 font-semibold">Active</span>
        </div>
      </div>
    </aside>
  );
}
