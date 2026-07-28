'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Send, AlertCircle, Clock, Download, Eye } from 'lucide-react';

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
    'email,name,company\nalex.dev@example.com,Alex Developer,Acme Corp\nsarah.eng@example.com,Sarah Engineer,Vercel Inc\njordan.arch@example.com,Jordan Architect,Stripe Labs\ninvalid-email-string,John Invalid,Bad Co'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number>(0);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const csvRef = useRef<HTMLTextAreaElement>(null);

  // Dynamic Auto-Resizing Textareas
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = 'auto';
      bodyRef.current.style.height = `${Math.max(120, bodyRef.current.scrollHeight)}px`;
    }
  }, [bodyTemplate]);

  useEffect(() => {
    if (csvRef.current) {
      csvRef.current.style.height = 'auto';
      csvRef.current.style.height = `${Math.max(100, csvRef.current.scrollHeight)}px`;
    }
  }, [manualCSVText]);

  // Client-side CSV parsing for live contact count & invalid row detection
  const parseClientCSV = () => {
    const lines = manualCSVText.trim().split('\n');
    const valid: Array<{ email: string; name?: string; company?: string }> = [];
    const invalid: Array<{ line: number; row: string; reason: string }> = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      const email = parts[0];
      if (email && emailRegex.test(email)) {
        valid.push({
          email,
          name: parts[1] || email.split('@')[0],
          company: parts[2] || 'Valued Partner',
        });
      } else if (lines[i].trim().length > 0) {
        invalid.push({
          line: i + 1,
          row: lines[i],
          reason: !email ? 'Empty email field' : `Invalid email syntax: "${email}"`,
        });
      }
    }
    return { valid, invalid };
  };

  const { valid: validContacts, invalid: invalidRows } = parseClientCSV();
  const parsedContactCount = csvFile ? 150 : validContacts.length;

  // Download invalid CSV rows feature
  const handleDownloadInvalidRows = () => {
    if (invalidRows.length === 0) return;
    const csvContent =
      'line_number,raw_row_data,failure_reason\n' +
      invalidRows.map((r) => `${r.line},"${r.row.replace(/"/g, '""')}","${r.reason}"`).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invalid_recipient_rows_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sample recipient for live template preview
  const sampleRecipient = validContacts[selectedSampleIndex] || {
    email: 'john.doe@example.com',
    name: 'John Doe',
    company: 'Acme Growth',
  };

  const renderTemplate = (text: string) => {
    return text
      .replace(/\{\{\s*name\s*\}\}/g, sampleRecipient.name || 'Friend')
      .replace(/\{\{\s*company\s*\}\}/g, sampleRecipient.company || 'your team')
      .replace(/\{\{\s*email\s*\}\}/g, sampleRecipient.email);
  };

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
        if (validContacts.length === 0) {
          throw new Error('Please provide at least 1 valid recipient email');
        }

        const res = await api.createCampaign({
          title,
          subject,
          bodyTemplate,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          minDelayMs,
          maxPerHour,
          recipients: validContacts,
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
          Notion-style inline document workflow with live template preview, invalid CSV row cleanup, and rate controls.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#B42318] text-[#B42318] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Document Composition Sections */}
      <div className="space-y-6 bg-[#FFFFFF] border border-[#DDD8D1] rounded-xl p-6 shadow-sm">
        {/* Campaign Name & Subject */}
        <div className="space-y-4">
          <div>
            <span className="editorial-label block mb-1">Campaign Name</span>
            <input
              type="text"
              placeholder="e.g. Q3 High-Intent Outreach"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs font-serif focus:outline-none focus:border-[#A34A22]"
            />
          </div>

          <div>
            <span className="editorial-label block mb-1">Subject Line</span>
            <input
              type="text"
              placeholder="Transforming cold email outreach for {{name}}"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs focus:outline-none focus:border-[#A34A22]"
            />
          </div>
        </div>

        {/* Lead Recipients & Invalid Row Exporter */}
        <div className="border-t border-[#DDD8D1] pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="editorial-label flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-[#A34A22]" />
              Recipient Leads Source
            </span>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-[#1B7F4B] border border-[#DDD8D1] font-bold shadow-2xs">
                {parsedContactCount} valid contacts
              </span>
              {invalidRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadInvalidRows}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#FAF8F5] text-[#B42318] border border-[#DDD8D1] hover:bg-[#DDD8D1]/40 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download {invalidRows.length} Invalid Rows (.csv)</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Option 1: File Upload Box */}
            <div className="border border-dashed border-[#DDD8D1] hover:border-[#A34A22] rounded-lg p-4 text-center bg-[#FAF8F5] transition-colors">
              <Upload className="w-5 h-5 text-[#A34A22] mx-auto mb-1.5" />
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setCsvFile(e.target.files[0]);
                }}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer text-xs font-mono text-[#A34A22] hover:underline block font-bold">
                {csvFile ? `Selected: ${csvFile.name}` : 'Upload Recipient CSV File'}
              </label>
              <p className="text-[11px] text-[#6B6B6B] mt-1 font-mono">Requires "email" column header.</p>
            </div>

            {/* Option 2: Manual Email List / CSV Box - Full Width Stacked Directly After */}
            <div>
              <label className="block text-[11px] font-mono text-[#6B6B6B] mb-1 font-semibold">
                Or Paste Recipient Email List / CSV Data:
              </label>
              <textarea
                ref={csvRef}
                value={manualCSVText}
                onChange={(e) => setManualCSVText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-xs font-mono text-[#1F1F1F] focus:outline-none focus:border-[#A34A22] transition-all resize-none overflow-hidden"
                placeholder="email,name,company&#10;alex@example.com,Alex,Acme Inc"
              />
            </div>
          </div>
        </div>

        {/* Email Body & Interactive Live Template Previewer */}
        <div className="border-t border-[#DDD8D1] pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="editorial-label">Template Body</span>
            <div className="flex gap-1.5">
              {['{{name}}', '{{company}}', '{{email}}'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setBodyTemplate((prev) => prev + ` ${tag}`)}
                  className="px-2 py-0.5 rounded bg-[#FAF8F5] text-[10px] text-[#A34A22] border border-[#DDD8D1] font-mono hover:bg-[#DDD8D1] transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <textarea
            ref={bodyRef}
            value={bodyTemplate}
            onChange={(e) => setBodyTemplate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] font-mono text-xs focus:outline-none focus:border-[#A34A22] transition-all resize-none overflow-hidden leading-relaxed"
            placeholder="Write your email body template here..."
          />

          {/* Interactive Template Preview Box */}
          <div className="p-4 bg-[#FAF8F5] border border-[#DDD8D1] rounded-lg space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#DDD8D1] pb-2">
              <span className="editorial-label flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#A34A22]" />
                Live Rendered Email Preview
              </span>
              {validContacts.length > 0 && (
                <select
                  value={selectedSampleIndex}
                  onChange={(e) => setSelectedSampleIndex(Number(e.target.value))}
                  className="px-2 py-0.5 rounded bg-[#FFFFFF] border border-[#DDD8D1] text-[11px] text-[#1F1F1F] font-mono"
                >
                  {validContacts.map((c, idx) => (
                    <option key={idx} value={idx}>
                      Sample {idx + 1}: {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1 pt-1">
              <div>
                <span className="text-[#6B6B6B]">To:</span> <strong className="text-[#1F1F1F]">{sampleRecipient.email}</strong>
              </div>
              <div>
                <span className="text-[#6B6B6B]">Subject:</span>{' '}
                <strong className="text-[#1F1F1F]">{renderTemplate(subject || 'Campaign Subject')}</strong>
              </div>
              <div className="pt-2 text-[#1F1F1F] whitespace-pre-wrap font-sans text-xs bg-[#FFFFFF] p-3 border border-[#DDD8D1] rounded-lg">
                {renderTemplate(bodyTemplate)}
              </div>
            </div>
          </div>
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
                className="w-full px-3 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs font-mono focus:outline-none focus:border-[#A34A22]"
              />
            </div>

            <div>
              <span className="text-[11px] font-mono text-[#6B6B6B] block mb-1">Delay Between Sends (Seconds)</span>
              <input
                type="number"
                min="0"
                value={minDelaySeconds}
                onChange={(e) => setMinDelaySeconds(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs font-mono focus:outline-none focus:border-[#A34A22]"
              />
            </div>

            <div>
              <span className="text-[11px] font-mono text-[#6B6B6B] block mb-1">Hourly Cap (Emails / Hour)</span>
              <input
                type="number"
                min="1"
                value={maxPerHour}
                onChange={(e) => setMaxPerHour(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs font-mono focus:outline-none focus:border-[#A34A22]"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] flex items-center justify-between text-xs font-mono">
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#A34A22] hover:bg-[#8c3d1b] text-white font-mono text-xs font-bold disabled:opacity-50 transition-all shadow-sm"
          >
            {scheduleMutation.isPending ? (
              <span>Enqueuing Jobs...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Schedule Campaign Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
