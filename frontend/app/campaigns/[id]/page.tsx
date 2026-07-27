'use client';

import React, { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2, AlertTriangle, Clock, ExternalLink, RefreshCw } from 'lucide-react';

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.getCampaignById(id),
    refetchInterval: 2000, // Live poll every 2s for active dispatch progress updates
  });

  const campaign = data?.data;

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400 text-xs">Loading campaign telemetry...</div>;
  }

  if (!campaign) {
    return <div className="p-12 text-center text-rose-400 text-xs">Campaign not found.</div>;
  }

  const successRate =
    campaign.totalRecipients > 0 ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Campaigns</span>
      </Link>

      {/* Header Info */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">{campaign.title}</h1>
              <Badge
                variant={
                  campaign.status === 'COMPLETED'
                    ? 'success'
                    : campaign.status === 'PROCESSING'
                    ? 'info'
                    : campaign.status === 'SCHEDULED'
                    ? 'warning'
                    : 'default'
                }
              >
                {campaign.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">ID: {campaign.id}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-400" />
            <span>Live Worker Sync</span>
          </div>
        </div>

        {/* Dispatch Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-border/40">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Target Contacts</span>
            <span className="text-xl font-bold text-white">{campaign.totalRecipients}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-border/40">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Successfully Sent</span>
            <span className="text-xl font-bold text-emerald-400">{campaign.sentCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-border/40">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Failed / Bounced</span>
            <span className="text-xl font-bold text-rose-400">{campaign.failedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-border/40">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Completion Rate</span>
            <span className="text-xl font-bold text-cyan-400">{successRate}%</span>
          </div>
        </div>

        <div className="pt-2">
          <ProgressBar value={campaign.sentCount} total={campaign.totalRecipients} />
        </div>
      </div>

      {/* Template & Metadata Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-lg space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Campaign Details</h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400">Subject:</span> <span className="text-white font-medium">{campaign.subject}</span>
            </div>
            <div>
              <span className="text-slate-400">Sender Engine:</span>{' '}
              <span className="text-white font-medium">{campaign.sender?.name || 'Default Ethereal Engine'}</span>
            </div>
            <div>
              <span className="text-slate-400">Created:</span> <span className="text-slate-300 font-mono">{formatDate(campaign.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-lg space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">HTML Template Body</h3>
          <div className="p-3 rounded-xl bg-slate-950 border border-border/60 text-xs font-mono text-slate-300 max-h-32 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{campaign.bodyTemplate}</pre>
          </div>
        </div>
      </div>

      {/* Recipient Logs Table */}
      <div className="rounded-2xl bg-card border border-border/80 shadow-lg overflow-hidden">
        <div className="p-5 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Recipient Dispatch Audit Log</h3>
          </div>
          <span className="text-xs text-slate-400">{campaign.recipients.length} recipients listed</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 border-b border-border/60 uppercase tracking-wider text-slate-400 text-[10px] font-semibold">
            <tr>
              <th className="p-4">Recipient Email</th>
              <th className="p-4">Metadata</th>
              <th className="p-4">Status</th>
              <th className="p-4">Sent Time</th>
              <th className="p-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {campaign.recipients.map((rec) => (
              <tr key={rec.id} className="hover:bg-card-hover/80 transition-colors">
                <td className="p-4 font-mono font-medium text-white">{rec.email}</td>
                <td className="p-4 text-slate-400">
                  {rec.metadataJson ? JSON.stringify(rec.metadataJson) : 'N/A'}
                </td>
                <td className="p-4">
                  <Badge
                    variant={
                      rec.status === 'SENT'
                        ? 'success'
                        : rec.status === 'PROCESSING'
                        ? 'info'
                        : rec.status === 'FAILED'
                        ? 'danger'
                        : 'default'
                    }
                  >
                    {rec.status}
                  </Badge>
                </td>
                <td className="p-4 font-mono text-slate-400">{formatDate(rec.sentAt)}</td>
                <td className="p-4 text-right">
                  {rec.errorMessage ? (
                    <span className="text-rose-400 text-[11px] font-mono">{rec.errorMessage}</span>
                  ) : rec.status === 'SENT' ? (
                    <span className="text-emerald-400 text-[11px]">Delivered</span>
                  ) : (
                    <span className="text-slate-500 text-[11px]">In Queue</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
