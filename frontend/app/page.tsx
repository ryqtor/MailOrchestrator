'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Activity, Clock, Zap, CheckCircle2, RefreshCw, Layers, ShieldCheck, AlertCircle } from 'lucide-react';

export default function OperationsOverviewPage() {
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

  const metrics = metricsData?.data;
  const campaigns = campaignsData?.data || [];

  const rateLimit = metrics?.rateLimit || {
    maxPerHour: 500,
    used: 0,
    remaining: 500,
    resetInMinutes: 60,
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Top Title Bar */}
      <div className="flex items-baseline justify-between border-b border-[#DDD8D1] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-[#1F1F1F] tracking-tight">
            MailOrchestrator Operations
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1 font-sans">
            Internal queue execution console, exposed Redis rate limiter capacity, and worker pipeline state.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#1B7F4B] bg-[#FFFFFF] px-3 py-1 rounded border border-[#DDD8D1]">
          <RefreshCw className="w-3 h-3 animate-spin text-[#1B7F4B]" />
          <span>Live Queue Metrics</span>
        </div>
      </div>

      {/* Exposed Rate Limit Capacity Panel */}
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

      {/* Interactive Queue Stage Visualizer with Checkboxes */}
      <div className="bg-[#FFFFFF] border border-[#DDD8D1] rounded p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#DDD8D1] pb-3">
          <span className="editorial-label flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#A34A22]" />
            Queue Stage Progress Flow
          </span>
          <span className="text-xs font-mono text-[#6B6B6B]">
            BullMQ Queue: <strong className="text-[#1F1F1F]">email-dispatch-queue</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono text-xs">
          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#6B6B6B]">
              <span>[1] CSV Uploaded</span>
              <span className="text-[#1B7F4B] font-bold">✓</span>
            </div>
            <div className="text-[#1F1F1F] font-bold text-sm font-serif">
              {metrics ? metrics.telemetry.totalRecipients : 0} Leads
            </div>
            <div className="text-[10px] text-[#6B6B6B]">Ingested & Parsed</div>
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#6B6B6B]">
              <span>[2] Jobs Enqueued</span>
              <span className="text-[#1B7F4B] font-bold">✓</span>
            </div>
            <div className="text-[#1F1F1F] font-bold text-sm font-serif">
              {metrics ? metrics.queue.waiting : 0} Waiting
            </div>
            <div className="text-[10px] text-[#6B6B6B]">BullMQ Redis queue</div>
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#6B6B6B]">
              <span>[3] Rate Limiter</span>
              <span className="text-[#A46A00] font-bold">ACTIVE</span>
            </div>
            <div className="text-[#1F1F1F] font-bold text-sm font-serif">
              {metrics ? metrics.queue.delayed : 0} Delayed
            </div>
            <div className="text-[10px] text-[#6B6B6B]">Hourly INCR check</div>
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#6B6B6B]">
              <span>[4] Worker Cluster</span>
              <span className="text-[#A34A22] font-bold">RUNNING</span>
            </div>
            <div className="text-[#1F1F1F] font-bold text-sm font-serif">
              {metrics ? metrics.telemetry.activeWorkers : 0} Nodes
            </div>
            <div className="text-[10px] text-[#6B6B6B]">Idempotency locked</div>
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#DDD8D1] rounded space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#6B6B6B]">
              <span>[5] Delivered</span>
              <span className="text-[#1B7F4B] font-bold">DELIVERED</span>
            </div>
            <div className="text-[#1F1F1F] font-bold text-sm font-serif">
              {metrics ? metrics.telemetry.sentToday : 0} Sent
            </div>
            <div className="text-[10px] text-[#6B6B6B]">Ethereal / SMTP</div>
          </div>
        </div>
      </div>

      {/* Main Operations Grid: Campaigns Execution Table & Execution Timeline Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Campaigns Table */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#DDD8D1] rounded overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#DDD8D1] flex items-center justify-between">
            <span className="editorial-label">Campaign Execution Pipeline</span>
            <Link href="/compose" className="text-xs font-mono text-[#A34A22] hover:underline font-semibold">
              + Launch Campaign Builder
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <div className="p-8 text-center text-[#6B6B6B] font-mono text-xs">
              No active campaign pipelines enqueued.
            </div>
          ) : (
            <div className="divide-y divide-[#DDD8D1]">
              {campaigns.map((c) => {
                const pct = c.totalRecipients > 0 ? Math.round((c.sentCount / c.totalRecipients) * 100) : 0;
                return (
                  <div key={c.id} className="p-4 flex items-center justify-between hover:bg-[#FAF8F5] transition-colors">
                    <div className="space-y-1 max-w-sm">
                      <div className="flex items-center gap-2">
                        <Link href={`/campaigns/${c.id}`} className="font-serif font-semibold text-sm text-[#1F1F1F] hover:text-[#A34A22]">
                          {c.title}
                        </Link>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#FAF8F5] text-[#1F1F1F] border border-[#DDD8D1]">
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B6B6B] truncate font-sans">Subject: {c.subject}</p>
                    </div>

                    <div className="w-36 font-mono text-xs text-right">
                      <div className="text-[#1F1F1F] font-bold">{c.sentCount} / {c.totalRecipients} ({pct}%)</div>
                      <div className="w-full bg-[#FAF8F5] border border-[#DDD8D1] h-1.5 rounded mt-1 overflow-hidden">
                        <div className="bg-[#A34A22] h-full rounded" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Execution Timeline Stream */}
        <div className="bg-[#FFFFFF] border border-[#DDD8D1] rounded p-4 space-y-3 shadow-sm">
          <span className="editorial-label block border-b border-[#DDD8D1] pb-2">
            Execution Timeline Stream
          </span>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-start gap-2">
              <span className="text-[#1B7F4B]">●</span>
              <div>
                <span className="text-[#1F1F1F] block font-semibold">Worker Node Active</span>
                <span className="text-[#6B6B6B] text-[10px]">Worker Health Monitoring active</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-[#A34A22]">●</span>
              <div>
                <span className="text-[#1F1F1F] block font-semibold">Database Idempotency Locked</span>
                <span className="text-[#6B6B6B] text-[10px]">PENDING → PROCESSING lock</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-[#A46A00]">●</span>
              <div>
                <span className="text-[#1F1F1F] block font-semibold">Redis Rate Check Passed</span>
                <span className="text-[#6B6B6B] text-[10px]">INCR capacity check</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-[#1B7F4B]">●</span>
              <div>
                <span className="text-[#1F1F1F] block font-semibold">Delivered to Ethereal</span>
                <span className="text-[#6B6B6B] text-[10px]">SMTP ACK 250 OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
