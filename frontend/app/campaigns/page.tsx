'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Send, Filter, Search, ChevronRight } from 'lucide-react';

export default function CampaignsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', statusFilter, page],
    queryFn: () => api.getCampaigns(statusFilter || undefined, page),
    refetchInterval: 3000,
  });

  const campaigns = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Email Campaigns</h1>
          <p className="text-xs text-slate-400">Manage, monitor progress, and inspect dispatch logs across all campaigns</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-border/60 text-white text-xs focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="DRAFT">Draft</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Showing {campaigns.length} campaigns</span>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="rounded-2xl bg-card border border-border/80 shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading campaigns data...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Send className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No email campaigns found.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-border/60 uppercase tracking-wider text-slate-400 text-[10px] font-semibold">
              <tr>
                <th className="p-4">Campaign Title & Subject</th>
                <th className="p-4">Status</th>
                <th className="p-4">Dispatch Progress</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-card-hover/80 transition-colors">
                  <td className="p-4">
                    <Link href={`/campaigns/${campaign.id}`} className="font-bold text-white hover:text-primary-400 block">
                      {campaign.title}
                    </Link>
                    <span className="text-[11px] text-slate-400 block truncate max-w-sm">{campaign.subject}</span>
                  </td>
                  <td className="p-4">
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
                  </td>
                  <td className="p-4 w-60">
                    <ProgressBar value={campaign.sentCount} total={campaign.totalRecipients} />
                  </td>
                  <td className="p-4 font-mono text-slate-400">{formatDate(campaign.createdAt)}</td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 font-medium"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Footer */}
        {pagination && pagination.pages > 1 && (
          <div className="p-4 border-t border-border/60 flex items-center justify-between text-xs text-slate-400">
            <span>Page {page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
