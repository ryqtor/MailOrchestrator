'use client';

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, FileText, Send, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCampaignModal({ isOpen, onClose }: ModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('Hi {{name}},\n\nWe are excited to share an update with {{company}}.\n\nBest regards,\nThe Team');
  const [scheduledAt, setScheduledAt] = useState('');
  
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewRecipients, setPreviewRecipients] = useState<Array<{ email: string; name?: string; company?: string }>>([]);
  const [manualCSVText, setManualCSVText] = useState('email,name,company\nalex@example.com,Alex Developer,Acme Corp\nsarah@example.com,Sarah Engineer,Vercel Inc\njordan@example.com,Jordan Architect,Stripe Labs');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          recipients,
        });
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
    setStep(1);
    setTitle('');
    setSubject('');
    setScheduledAt('');
    setCsvFile(null);
    setPreviewRecipients([]);
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  const parseManualCSV = () => {
    try {
      const lines = manualCSVText.trim().split('\n');
      const recipients: Array<{ email: string; name?: string; company?: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts[0] && parts[0].includes('@')) {
          recipients.push({ email: parts[0], name: parts[1], company: parts[2] });
        }
      }
      setPreviewRecipients(recipients);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Create Email Campaign</h2>
              <p className="text-xs text-slate-400">Step {step} of 3 • Campaign Orchestration</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Product Launch Announcement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-border/80 text-white text-xs focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  placeholder="Introducing MailOrchestrator v2 for {{name}}"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-border/80 text-white text-xs focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Schedule Delayed Dispatch (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-border/80 text-white text-xs focus:outline-none focus:border-primary-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Leave empty to dispatch immediately into BullMQ workers.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Upload Recipient CSV File
                </label>
                <div className="border-2 border-dashed border-border/80 hover:border-primary-500/50 rounded-xl p-6 text-center bg-slate-900/40 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCsvFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="csv-upload-input"
                  />
                  <label htmlFor="csv-upload-input" className="cursor-pointer text-xs font-medium text-primary-400 hover:underline">
                    {csvFile ? `Selected: ${csvFile.name}` : 'Click to browse CSV file'}
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">Requires 'email' column. Additional columns mapped to template variables.</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Or Paste CSV Recipient Raw Text
                </label>
                <textarea
                  rows={4}
                  value={manualCSVText}
                  onChange={(e) => {
                    setManualCSVText(e.target.value);
                    parseManualCSV();
                  }}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Email HTML / Body Template
                  </label>
                  <div className="flex gap-1">
                    {['{{name}}', '{{company}}', '{{email}}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setBodyTemplate((prev) => prev + ` ${tag}`)}
                        className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-primary-400 border border-primary-500/20 font-mono hover:bg-slate-700"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-border/80 text-xs text-white font-mono focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-border/60">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Live Dispatch Summary
                </span>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Title:</span> <span className="text-white font-medium">{title}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Subject:</span> <span className="text-white font-medium">{subject}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Recipients:</span>{' '}
                    <span className="text-emerald-400 font-bold">{csvFile ? csvFile.name : `${manualCSVText.split('\n').length - 1} contacts`}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Execution:</span>{' '}
                    <span className="text-cyan-400 font-medium">{scheduledAt ? `Delayed at ${new Date(scheduledAt).toLocaleString()}` : 'Immediate BullMQ Batch'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between bg-slate-900/50">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              disabled={!title || !subject}
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium disabled:opacity-50"
            >
              Next Step
            </button>
          ) : (
            <button
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-accent-emerald text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 hover:opacity-95 disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <span>Scheduling Jobs...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Launch Campaign</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
