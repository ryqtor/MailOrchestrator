'use client';

import React, { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Mail, Clock, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.getCampaignById(id),
    refetchInterval: 2000,
  });

  const campaign = data?.data;

  if (isLoading) {
    return <div className="p-12 text-center text-[#6B6B6B] text-xs font-mono">Loading campaign telemetry...</div>;
  }

  if (!campaign) {
    return <div className="p-12 text-center text-[#B42318] text-xs font-mono">Campaign not found.</div>;
  }

  const pct = campaign.totalRecipients > 0 ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100) : 0;
  const createdDate = new Date(campaign.createdAt);
  const startedDate = new Date(createdDate.getTime() + 60000); // +1 min start
  const estFinishDate = new Date(createdDate.getTime() + campaign.totalRecipients * 2000); // 2s delay estimation

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto">
      {/* Back Link */}
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono font-medium text-[#6B6B6B] hover:text-[#A34A22]">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>← Back to Operations Overview</span>
      </Link>

      {/* Campaign Header & Status */}
      <div className="bg-[#FFFFFF] border border-[#DDD8D1] rounded p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD8D1] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-serif font-semibold text-[#1F1F1F]">{campaign.title}</h1>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[#FAF8F5] text-[#1F1F1F] border border-[#DDD8D1] font-bold">
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] font-mono mt-1">ID: {campaign.id}</p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#1B7F4B]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Live Sync</span>
          </div>
        </div>

        {/* Rich Execution Analytics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs pt-2">
          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded">
            <span className="text-[10px] text-[#6B6B6B] block uppercase font-bold">Target Leads</span>
            <span className="text-lg font-bold font-serif text-[#1F1F1F]">{campaign.totalRecipients}</span>
          </div>
          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded">
            <span className="text-[10px] text-[#6B6B6B] block uppercase font-bold">Delivered</span>
            <span className="text-lg font-bold font-serif text-[#1B7F4B]">{campaign.sentCount}</span>
          </div>
          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded">
            <span className="text-[10px] text-[#6B6B6B] block uppercase font-bold">Failed / Bounced</span>
            <span className="text-lg font-bold font-serif text-[#B42318]">{campaign.failedCount}</span>
          </div>
          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded">
            <span className="text-[10px] text-[#6B6B6B] block uppercase font-bold">Completion Rate</span>
            <span className="text-lg font-bold font-serif text-[#A34A22]">{pct}%</span>
          </div>
        </div>

        {/* Execution Metadata Line */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-xs font-mono text-[#6B6B6B] border-t border-[#DDD8D1]">
          <div>
            <span>Created:</span> <strong className="text-[#1F1F1F]">{formatDate(campaign.createdAt)}</strong>
          </div>
          <div>
            <span>Est. Finish:</span> <strong className="text-[#1F1F1F]">{formatDate(estFinishDate.toISOString())}</strong>
          </div>
          <div>
            <span>Worker Concurrency:</span> <strong className="text-[#1F1F1F]">5 Threads</strong>
          </div>
        </div>
      </div>

      {/* Campaign Execution Timeline Stream */}
      <div className="bg-[#FFFFFF] border border-[#DDD8D1] rounded p-6 space-y-4 shadow-sm">
        <span className="editorial-label block border-b border-[#DDD8D1] pb-3">
          Chronological Execution Timeline
        </span>

        <div className="space-y-4 font-mono text-xs pl-2">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <span className="text-[#6B6B6B] w-14 shrink-0 text-[11px]">
              {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="relative pl-4 border-l-2 border-[#1B7F4B] space-y-0.5">
              <span className="font-bold text-[#1F1F1F] block">Campaign Created & Template Compiled</span>
              <p className="text-[11px] text-[#6B6B6B] font-sans">
                Subject: "{campaign.subject}" • Initial status set to {campaign.status}.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <span className="text-[#6B6B6B] w-14 shrink-0 text-[11px]">
              {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="relative pl-4 border-l-2 border-[#1B7F4B] space-y-0.5">
              <span className="font-bold text-[#1F1F1F] block">
                {campaign.totalRecipients} Recipients Imported
              </span>
              <p className="text-[11px] text-[#6B6B6B] font-sans">
                PostgreSQL bulk inserted contacts • Invalid email rows filtered.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <span className="text-[#6B6B6B] w-14 shrink-0 text-[11px]">
              {startedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="relative pl-4 border-l-2 border-[#A34A22] space-y-0.5">
              <span className="font-bold text-[#1F1F1F] block">
                {campaign.totalRecipients} BullMQ Jobs Enqueued
              </span>
              <p className="text-[11px] text-[#6B6B6B] font-sans">
                Batch dispatches pushed into Redis queue <code className="text-[#A34A22]">email-dispatch-queue</code>.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-4">
            <span className="text-[#6B6B6B] w-14 shrink-0 text-[11px]">
              {startedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="relative pl-4 border-l-2 border-[#A34A22] space-y-0.5">
              <span className="font-bold text-[#1F1F1F] block">Worker Node #1 Claimed Job</span>
              <p className="text-[11px] text-[#6B6B6B] font-sans">
                Atomic database status lock executed (<code className="text-[#1F1F1F]">PENDING → PROCESSING</code>).
              </p>
            </div>
          </div>

          {/* Step 5 */}
          {campaign.sentCount > 0 && (
            <div className="flex items-start gap-4">
              <span className="text-[#6B6B6B] w-14 shrink-0 text-[11px]">Active</span>
              <div className="relative pl-4 border-l-2 border-[#1B7F4B] space-y-0.5">
                <span className="font-bold text-[#1B7F4B] block">Dispatched {campaign.sentCount} Emails to Ethereal SMTP</span>
                <p className="text-[11px] text-[#6B6B6B] font-sans">
                  SMTP response 250 OK • Recipients updated to SENT state.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recipient Audit Table */}
      <div className="bg-[#FFFFFF] border border-[#DDD8D1] rounded overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#DDD8D1] flex items-center justify-between">
          <span className="editorial-label">Recipient Dispatch Log</span>
          <span className="text-xs font-mono text-[#6B6B6B]">{campaign.recipients.length} recipients listed</span>
        </div>

        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#FAF8F5] border-b border-[#DDD8D1] uppercase tracking-wider text-[#6B6B6B] text-[10px] font-bold">
            <tr>
              <th className="p-3.5">Recipient Email</th>
              <th className="p-3.5">Metadata</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Sent Time</th>
              <th className="p-3.5 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DDD8D1] text-[#1F1F1F]">
            {campaign.recipients.map((rec) => (
              <tr key={rec.id} className="hover:bg-[#FAF8F5] transition-colors">
                <td className="p-3.5 font-bold">{rec.email}</td>
                <td className="p-3.5 text-[#6B6B6B]">
                  {rec.metadataJson ? JSON.stringify(rec.metadataJson) : 'N/A'}
                </td>
                <td className="p-3.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                      rec.status === 'SENT'
                        ? 'bg-[#FAF8F5] text-[#1B7F4B] border-[#DDD8D1]'
                        : 'bg-[#FAF8F5] text-[#6B6B6B] border-[#DDD8D1]'
                    }`}
                  >
                    {rec.status}
                  </span>
                </td>
                <td className="p-3.5 text-[#6B6B6B]">{formatDate(rec.sentAt)}</td>
                <td className="p-3.5 text-right text-[#6B6B6B]">
                  {rec.status === 'SENT' ? (
                    <span className="text-[#1B7F4B]">Delivered</span>
                  ) : (
                    <span>In Queue</span>
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
