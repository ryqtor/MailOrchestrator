'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { RefreshCw, Layers, ShieldCheck, Plus, Inbox, Clock, Send, CheckCircle2 } from 'lucide-react';
import { CreateCampaignModal } from '@/components/campaigns/CreateCampaignModal';

export default function OperationsOverviewPage() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);

  const { data: metricsData } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => api.getMetrics(),
    refetchInterval: 2000,
  });

  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.getCampaigns(undefined, 1),
    refetchInterval: 3000,
  });

  const { data: scheduledEmailsData, isLoading: isScheduledLoading } = useQuery({
    queryKey: ['scheduled-emails'],
    queryFn: () => api.getScheduledEmails(1),
    refetchInterval: 3000,
  });

  const { data: sentEmailsData, isLoading: isSentLoading } = useQuery({
    queryKey: ['sent-emails'],
    queryFn: () => api.getSentEmails(1),
    refetchInterval: 3000,
  });

  const metrics = metricsData?.data;
  const campaigns = campaignsData?.data || [];
  const scheduledEmails = scheduledEmailsData?.data || [];
  const sentEmails = sentEmailsData?.data || [];

  const rateLimit = metrics?.rateLimit || {
    maxPerHour: 500,
    used: 0,
    remaining: 500,
    resetInMinutes: 60,
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Top Title Bar with Primary Compose Button */}
      <div className="flex items-center justify-between border-b border-[#DDD8D1] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-[#1F1F1F] tracking-tight">
            MailOrchestrator Operations Dashboard
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1 font-sans">
            Production BullMQ delayed email scheduler, Redis rate limit capacity, and email status tables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsComposeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded bg-[#A34A22] hover:bg-[#8c3d1b] text-white text-xs font-semibold font-mono transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Compose New Email</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#1B7F4B] bg-[#FFFFFF] px-3 py-1.5 rounded border border-[#DDD8D1]">
            <RefreshCw className="w-3 h-3 animate-spin text-[#1B7F4B]" />
            <span>Live Sync</span>
          </div>
        </div>
      </div>

      {/* Rate Limit Capacity Panel */}
      <div className="bg-[#FFFFFF] border border-[#DDD8D1] rounded p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#DDD8D1] pb-3">
          <span className="editorial-label flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#A34A22]" />
            Sender Hourly Rate Limit Window (Redis Counter)
          </span>
          <span className="text-xs font-mono text-[#6B6B6B]">
            Next Reset Window: <strong className="text-[#1F1F1F]">{rateLimit.resetInMinutes} minutes</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded">
            <span className="text-[10px] text-[#6B6B6B] block uppercase font-bold">Configured Limit</span>
            <span className="text-xl font-bold font-serif text-[#1F1F1F]">{rateLimit.maxPerHour} / hr</span>
          </div>
          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded">
            <span className="text-[10px] text-[#6B6B6B] block uppercase font-bold">Used in Current Window</span>
            <span className="text-xl font-bold font-serif text-[#A46A00]">{rateLimit.used}</span>
          </div>
          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded">
            <span className="text-[10px] text-[#6B6B6B] block uppercase font-bold">Remaining Capacity</span>
            <span className="text-xl font-bold font-serif text-[#1B7F4B]">{rateLimit.remaining}</span>
          </div>
          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded">
            <span className="text-[10px] text-[#6B6B6B] block uppercase font-bold">Rescheduled / Delayed</span>
            <span className="text-xl font-bold font-serif text-[#A34A22]">{metrics?.queue.delayed ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Section Tabs: Scheduled Emails & Sent Emails */}
      <div className="bg-[#FFFFFF] border border-[#DDD8D1] rounded overflow-hidden shadow-sm">
        {/* Tab Headers */}
        <div className="border-b border-[#DDD8D1] bg-[#FAF8F5] px-4 flex items-center justify-between">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`py-3.5 text-xs font-mono font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'scheduled'
                  ? 'border-[#A34A22] text-[#A34A22]'
                  : 'border-transparent text-[#6B6B6B] hover:text-[#1F1F1F]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Scheduled Emails</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-[#FFFFFF] border border-[#DDD8D1] text-[#1F1F1F]">
                {scheduledEmails.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`py-3.5 text-xs font-mono font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'sent'
                  ? 'border-[#1B7F4B] text-[#1B7F4B]'
                  : 'border-transparent text-[#6B6B6B] hover:text-[#1F1F1F]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sent Emails</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-[#FFFFFF] border border-[#DDD8D1] text-[#1F1F1F]">
                {sentEmails.length}
              </span>
            </button>
          </div>

          <Link href="/compose" className="text-xs font-mono text-[#A34A22] hover:underline font-semibold hidden sm:inline">
            + Compose Page
          </Link>
        </div>

        {/* Tab Content: Scheduled Emails Table */}
        {activeTab === 'scheduled' && (
          <div>
            {isScheduledLoading ? (
              <div className="p-12 text-center text-[#6B6B6B] text-xs font-mono">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A34A22]" />
                Loading scheduled emails...
              </div>
            ) : scheduledEmails.length === 0 ? (
              <div className="p-12 text-center text-[#6B6B6B]">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-sans">No scheduled emails in queue. Click "Compose New Email" to schedule one.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#FAF8F5] border-b border-[#DDD8D1] uppercase tracking-wider text-[#6B6B6B] text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Recipient Email</th>
                    <th className="p-3.5">Campaign Title / Subject</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Scheduled For</th>
                    <th className="p-3.5 text-right">Job Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD8D1] text-[#1F1F1F]">
                  {scheduledEmails.map((email) => (
                    <tr key={email.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="p-3.5 font-bold">{email.recipient?.email || 'N/A'}</td>
                      <td className="p-3.5 text-[#6B6B6B]">{email.campaign?.title || email.campaign?.subject || 'N/A'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#FAF8F5] text-[#A46A00] border border-[#DDD8D1]">
                          {email.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#6B6B6B]">{formatDate(email.scheduledFor)}</td>
                      <td className="p-3.5 text-right text-[#6B6B6B]">{email.attempts} / 3</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab Content: Sent Emails Table */}
        {activeTab === 'sent' && (
          <div>
            {isSentLoading ? (
              <div className="p-12 text-center text-[#6B6B6B] text-xs font-mono">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1B7F4B]" />
                Loading sent emails delivery archive...
              </div>
            ) : sentEmails.length === 0 ? (
              <div className="p-12 text-center text-[#6B6B6B]">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-sans">No sent emails recorded yet.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#FAF8F5] border-b border-[#DDD8D1] uppercase tracking-wider text-[#6B6B6B] text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Recipient Email</th>
                    <th className="p-3.5">Campaign Title</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Sent Timestamp</th>
                    <th className="p-3.5 text-right">Job ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD8D1] text-[#1F1F1F]">
                  {sentEmails.map((email) => (
                    <tr key={email.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="p-3.5 font-bold">{email.recipient?.email || 'N/A'}</td>
                      <td className="p-3.5 text-[#6B6B6B]">{email.campaign?.title || 'N/A'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#FAF8F5] text-[#1B7F4B] border border-[#DDD8D1]">
                          SENT
                        </span>
                      </td>
                      <td className="p-3.5 text-[#6B6B6B]">{formatDate(email.sentAt || email.createdAt)}</td>
                      <td className="p-3.5 text-right text-[#6B6B6B] text-[11px]">{email.jobId || 'email-job'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Compose Campaign Modal */}
      <CreateCampaignModal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
      />
    </div>
  );
}
