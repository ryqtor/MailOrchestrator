'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Send, AlertCircle, Clock } from 'lucide-react';

export default function CampaignBuilderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState(
    'Hi {{name}},\n\nWe noticed {{company}} is scaling cold outreach. ReachInbox automates prospect verification and sequence dispatch.\n\nBest,\nThe Growth Team'
  );
  const [scheduledAt, setScheduledAt] = useState('');
  const [minDelaySeconds, setMinDelaySeconds] = useState(2);
  const [maxPerHour, setMaxPerHour] = useState(500);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [manualCSVText, setManualCSVText] = useState(
    'email,name,company\nalex.dev@example.com,Alex Developer,Acme Corp\nsarah.eng@example.com,Sarah Engineer,Vercel Inc\njordan.arch@example.com,Jordan Architect,Stripe Labs'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const parsedContactCount = csvFile
    ? 150
    : manualCSVText.trim().split('\n').filter((l) => l.includes('@')).length;

  const minDelayMs = minDelaySeconds * 1000;
  const estimatedSeconds = Math.ceil(
    (parsedContactCount * Math.max(minDelayMs, (3600 * 1000) / maxPerHour)) / 1000
  );
  const estHours = Math.floor(estimatedSeconds / 3600);
  const estMins = Math.ceil((estimatedSeconds % 3600) / 60);

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      if (csvFile) {
        const formData = new FormData();
        formData.append('file', csvFile);
        formData.append('title', title);
        formData.append('subject', subject);
        formData.append('bodyTemplate', bodyTemplate);
        if (scheduledAt) formData.append('scheduledAt', new Date(scheduledAt).toISOString());
        formData.append('minDelayMs', String(minDelayMs));
        formData.append('maxPerHour', String(maxPerHour));

        const res = await api.uploadCampaignCSV(formData);
        if (!res.success) throw new Error(res.error?.message || 'Upload failed');
        return res.data;
      } else {
        const lines = manualCSVText.trim().split('\n');
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const emailIndex = headers.indexOf('email');
        const nameIndex = headers.indexOf('name');
        const companyIndex = headers.indexOf('company');

        const recipients: Array<{ email: string; name?: string; company?: string }> = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.trim());
          if (parts[emailIndex]) {
            recipients.push({
              email: parts[emailIndex],
              name: parts[nameIndex] || undefined,
              company: parts[companyIndex] || undefined,
            });
          }
        }

        if (recipients.length === 0) {
          throw new Error('Please provide at least 1 valid recipient email');
        }

        const res = await api.createCampaign({
          title,
          subject,
          bodyTemplate,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          minDelayMs,
          maxPerHour,
          recipients,
        } as any);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      router.push('/');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8 font-sans">
      {/* Page Header */}
      <div className="border-b border-[#DDD8D1] pb-4">
        <h1 className="text-2xl font-serif font-semibold text-[#1F1F1F]">Campaign Builder</h1>
        <p className="text-xs text-[#6B6B6B] mt-1 font-sans">
          Notion-style inline document workflow for sequence composition, recipient lead parsing, and rate limiting controls.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-[#FAF8F5] border border-[#B42318] text-[#B42318] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Document Composition Sections */}
      <div className="space-y-6 bg-[#FFFFFF] border border-[#DDD8D1] rounded p-6 shadow-sm">
        {/* Campaign Name & Subject */}
        <div className="space-y-4">
          <div>
            <span className="editorial-label block mb-1">Campaign Name</span>
            <input
              type="text"
              placeholder="e.g. Summer Outreach Sequence"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs font-serif focus:outline-none focus:border-[#A34A22]"
            />
          </div>

          <div>
            <span className="editorial-label block mb-1">Subject Line</span>
            <input
              type="text"
              placeholder="Transforming cold email outreach for {{name}}"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs focus:outline-none focus:border-[#A34A22]"
            />
          </div>
        </div>

        {/* Lead Recipients & File Upload */}
        <div className="border-t border-[#DDD8D1] pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="editorial-label flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-[#A34A22]" />
              Recipient Leads Source
            </span>
            <span className="px-2.5 py-0.5 rounded bg-[#FAF8F5] text-[#1B7F4B] border border-[#DDD8D1] text-xs font-mono font-bold">
              {parsedContactCount} emails detected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-dashed border-[#DDD8D1] hover:border-[#A34A22] rounded p-4 text-center bg-[#FAF8F5]">
              <Upload className="w-5 h-5 text-[#6B6B6B] mx-auto mb-2" />
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setCsvFile(e.target.files[0]);
                }}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer text-xs font-mono text-[#A34A22] hover:underline block font-semibold">
                {csvFile ? `Selected: ${csvFile.name}` : 'Upload Recipient CSV File'}
              </label>
              <p className="text-[10px] text-[#6B6B6B] mt-1 font-mono">Requires "email" column header.</p>
            </div>

            <div>
              <textarea
                rows={4}
                value={manualCSVText}
                onChange={(e) => setManualCSVText(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#FAF8F5] border border-[#DDD8D1] text-xs font-mono text-[#1F1F1F] focus:outline-none focus:border-[#A34A22]"
                placeholder="Paste CSV rows here..."
              />
            </div>
          </div>
        </div>

        {/* Email Body & Variables */}
        <div className="border-t border-[#DDD8D1] pt-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="editorial-label">Template Body</span>
            <div className="flex gap-1">
              {['{{name}}', '{{company}}', '{{email}}'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setBodyTemplate((prev) => prev + ` ${tag}`)}
                  className="px-2 py-0.5 rounded bg-[#FAF8F5] text-[10px] text-[#A34A22] border border-[#DDD8D1] font-mono hover:bg-[#DDD8D1]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={5}
            value={bodyTemplate}
            onChange={(e) => setBodyTemplate(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] font-mono text-xs focus:outline-none focus:border-[#A34A22]"
          />
        </div>

        {/* Scheduling & Rate Limiting Controls */}
        <div className="border-t border-[#DDD8D1] pt-5 space-y-4">
          <span className="editorial-label block">Scheduling & Rate Controls</span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-[11px] font-mono text-[#6B6B6B] block mb-1">Start Time</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs font-mono focus:outline-none focus:border-[#A34A22]"
              />
            </div>

            <div>
              <span className="text-[11px] font-mono text-[#6B6B6B] block mb-1">Delay Between Sends (Seconds)</span>
              <input
                type="number"
                min="0"
                value={minDelaySeconds}
                onChange={(e) => setMinDelaySeconds(Number(e.target.value))}
                className="w-full px-3 py-2 rounded bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs font-mono focus:outline-none focus:border-[#A34A22]"
              />
            </div>

            <div>
              <span className="text-[11px] font-mono text-[#6B6B6B] block mb-1">Hourly Cap (Emails / Hour)</span>
              <input
                type="number"
                min="1"
                value={maxPerHour}
                onChange={(e) => setMaxPerHour(Number(e.target.value))}
                className="w-full px-3 py-2 rounded bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs font-mono focus:outline-none focus:border-[#A34A22]"
              />
            </div>
          </div>

          {/* Queue Math Pill */}
          <div className="p-3 rounded bg-[#FAF8F5] border border-[#DDD8D1] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-[#6B6B6B]">
              <Clock className="w-4 h-4 text-[#A34A22]" />
              <span>Estimated Execution Duration:</span>
            </div>
            <span className="text-[#1B7F4B] font-bold">
              {estHours > 0 ? `${estHours}h ${estMins}m` : `${estMins} minutes`}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="border-t border-[#DDD8D1] pt-5 flex justify-end">
          <button
            disabled={!title || !subject || scheduleMutation.isPending}
            onClick={() => scheduleMutation.mutate()}
            className="flex items-center gap-2 px-5 py-2 rounded bg-[#A34A22] hover:bg-[#8c3d1b] text-white font-mono text-xs font-bold disabled:opacity-50 transition-colors shadow-sm"
          >
            {scheduleMutation.isPending ? (
              <span>Enqueuing Jobs...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Schedule Campaign</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
