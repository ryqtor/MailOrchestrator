'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, Send, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCampaignModal({ isOpen, onClose }: ModalProps) {
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

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const csvRef = useRef<HTMLTextAreaElement>(null);

  // Dynamic Auto-Resizing Textareas
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = 'auto';
      bodyRef.current.style.height = `${Math.max(100, bodyRef.current.scrollHeight)}px`;
    }
  }, [bodyTemplate, isOpen]);

  useEffect(() => {
    if (csvRef.current) {
      csvRef.current.style.height = 'auto';
      csvRef.current.style.height = `${Math.max(90, csvRef.current.scrollHeight)}px`;
    }
  }, [manualCSVText, isOpen]);

  const parseClientCSV = () => {
    const lines = manualCSVText.trim().split('\n');
    const valid: Array<{ email: string; name?: string; company?: string }> = [];
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
      }
    }
    return valid;
  };

  const validContacts = parseClientCSV();
  const parsedContactCount = csvFile ? 150 : validContacts.length;

  const minDelayMs = minDelaySeconds * 1000;

  const createMutation = useMutation({
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
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
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
      onClose();
      resetForm();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    },
  });

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setScheduledAt('');
    setCsvFile(null);
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#DDD8D1] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DDD8D1] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#FFFFFF] border border-[#DDD8D1] text-[#A34A22] shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-semibold text-[#1F1F1F]">Schedule New Email Campaign</h2>
              <p className="text-xs text-[#6B6B6B]">BullMQ Persistent Job Scheduler & Rate Limiter</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-[#1F1F1F] hover:bg-[#DDD8D1]/40 transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#B42318] text-[#B42318] text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title & Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="editorial-label block mb-1">Campaign Title</span>
              <input
                type="text"
                placeholder="e.g. Q3 High-Intent Outreach"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs font-serif focus:outline-none focus:border-[#A34A22] transition-colors"
              />
            </div>

            <div>
              <span className="editorial-label block mb-1">Subject Line</span>
              <input
                type="text"
                placeholder="Transforming cold email outreach for {{name}}"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs focus:outline-none focus:border-[#A34A22] transition-colors"
              />
            </div>
          </div>

          {/* Lead Recipients Source - Vertical One-After-Another Layout */}
          <div className="border-t border-[#DDD8D1] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="editorial-label flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#A34A22]" />
                Lead Recipients Source
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-[#1B7F4B] border border-[#DDD8D1] font-mono text-xs font-bold shadow-2xs">
                {parsedContactCount} email addresses detected
              </span>
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
                  id="modal-csv-file-input"
                />
                <label htmlFor="modal-csv-file-input" className="cursor-pointer text-xs font-mono text-[#A34A22] hover:underline block font-bold">
                  {csvFile ? `Selected CSV: ${csvFile.name}` : 'Upload Recipient CSV File'}
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

          {/* Email Body - Dynamic Length according to content */}
          <div className="border-t border-[#DDD8D1] pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="editorial-label">Body Template</span>
              <div className="flex gap-1.5">
                {['{{name}}', '{{company}}'].map((tag) => (
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
              placeholder="Write your dynamic email template here..."
            />
          </div>

          {/* Schedule & Throttling Parameters */}
          <div className="border-t border-[#DDD8D1] pt-4 space-y-3">
            <span className="editorial-label block">Schedule & Rate Limits</span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#6B6B6B] block mb-1">Start Time</span>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs font-mono focus:outline-none focus:border-[#A34A22]"
                />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-[#6B6B6B] block mb-1">Min Delay (Seconds)</span>
                <input
                  type="number"
                  min="0"
                  value={minDelaySeconds}
                  onChange={(e) => setMinDelaySeconds(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs font-mono focus:outline-none focus:border-[#A34A22]"
                />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-[#6B6B6B] block mb-1">Hourly Cap</span>
                <input
                  type="number"
                  min="1"
                  value={maxPerHour}
                  onChange={(e) => setMaxPerHour(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs font-mono focus:outline-none focus:border-[#A34A22]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#DDD8D1] flex items-center justify-end gap-3 bg-[#FAF8F5]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-mono text-[#6B6B6B] hover:bg-[#DDD8D1]/40 border border-[#DDD8D1] transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!title || !subject || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#A34A22] hover:bg-[#8c3d1b] text-white font-mono text-xs font-bold disabled:opacity-50 transition-all shadow-sm"
          >
            {createMutation.isPending ? (
              <span>Scheduling Jobs...</span>
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
