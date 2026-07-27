'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { RefreshCw, Inbox } from 'lucide-react';

export default function DeliveryArchivePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sent-emails'],
    queryFn: () => api.getSentEmails(1),
    refetchInterval: 4000,
  });

  const emails = data?.data || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      <div className="flex items-baseline justify-between border-b border-[#DDD8D1] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-[#1F1F1F]">Delivery Archive</h1>
          <p className="text-xs text-[#6B6B6B] mt-1 font-sans">
            Audit history of emails successfully delivered by workers to Ethereal SMTP.
          </p>
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#DDD8D1] rounded overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-[#6B6B6B] text-xs font-mono">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A34A22]" />
            Loading delivery archive...
          </div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center text-[#6B6B6B]">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-sans">No sent email audit logs recorded yet.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#FAF8F5] border-b border-[#DDD8D1] uppercase tracking-wider text-[#6B6B6B] text-[10px] font-bold">
              <tr>
                <th className="p-3.5">Recipient Email</th>
                <th className="p-3.5">Campaign Title</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Sent Timestamp</th>
                <th className="p-3.5 text-right">Job Identifier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD8D1] text-[#1F1F1F]">
              {emails.map((email) => (
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
    </div>
  );
}
