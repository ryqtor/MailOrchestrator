'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { RefreshCw, Inbox, ExternalLink, CheckCircle2 } from 'lucide-react';

export default function DeliveryArchivePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sent-emails'],
    queryFn: () => api.getSentEmails(1),
    refetchInterval: 3000,
  });

  const emails = data?.data || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      <div className="flex items-baseline justify-between border-b border-[#DDD8D1] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1F1F]">Delivery Archive</h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Real-time audit history of emails dispatched by BullMQ workers to SMTP servers.
          </p>
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#DDD8D1] rounded-lg overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-[#6B6B6B] text-xs font-mono">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1B7F4B]" />
            Loading live delivery archive...
          </div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center text-[#6B6B6B]">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#6B6B6B]" />
            <p className="text-xs">No dispatched email logs recorded yet. Schedule a campaign to send emails.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#FAF8F5] border-b border-[#DDD8D1] uppercase tracking-wider text-[#6B6B6B] text-[10px] font-bold">
              <tr>
                <th className="p-3.5">Recipient Email</th>
                <th className="p-3.5">Campaign Title</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Dispatched At</th>
                <th className="p-3.5 text-right">Ethereal / SMTP Audit Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD8D1] text-[#1F1F1F]">
              {emails.map((email) => {
                const log = email.logs?.find((l) => l.eventType === 'EMAIL_SENT');
                const previewUrl = log?.detailsJson?.previewUrl;
                const messageId = log?.detailsJson?.messageId || email.jobId || 'smtp-dispatched';

                return (
                  <tr key={email.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="p-3.5 font-semibold text-[#1F1F1F]">{email.recipient?.email || 'N/A'}</td>
                    <td className="p-3.5 text-[#6B6B6B]">{email.campaign?.title || 'N/A'}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-[#1B7F4B]/10 text-[#1B7F4B] border border-[#1B7F4B]/30">
                        <CheckCircle2 className="w-3 h-3" />
                        SENT
                      </span>
                    </td>
                    <td className="p-3.5 text-[#6B6B6B]">{formatDate(email.sentAt || email.createdAt)}</td>
                    <td className="p-3.5 text-right font-mono">
                      {previewUrl ? (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#A34A22]/10 hover:bg-[#A34A22]/20 text-[#A34A22] font-semibold text-[11px] transition-colors"
                        >
                          <span>View Sent Email</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#6B6B6B]">{messageId}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
