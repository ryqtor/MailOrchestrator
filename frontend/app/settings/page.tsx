'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Mail, Server, CheckCircle2, AlertCircle, RefreshCw, Send, HelpCircle, Zap } from 'lucide-react';
import { EmailSender } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function SettingsPage() {
  const [sender, setSender] = useState<EmailSender | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [isEthereal, setIsEthereal] = useState(true);
  const [maxPerHour, setMaxPerHour] = useState(500);
  const [minDelayMs, setMinDelayMs] = useState(100);

  // Test Connection State
  const [testRecipient, setTestRecipient] = useState('');
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showGmailHelp, setShowGmailHelp] = useState(false);

  useEffect(() => {
    fetchSender();
  }, []);

  const fetchSender = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/senders/default`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const s = json.data as EmailSender;
          setSender(s);
          setName(s.name || '');
          setFromEmail(s.fromEmail || '');
          setSmtpHost(s.smtpHost || '');
          setSmtpPort(s.smtpPort || 587);
          setSmtpUser(s.smtpUser || '');
          setSmtpPass(s.smtpPass || '');
          setIsEthereal(s.isEthereal);
          setMaxPerHour(s.maxPerHour || 500);
          setMinDelayMs(s.minDelayMs || 100);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sender profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyGmailPreset = () => {
    setIsEthereal(false);
    setSmtpHost('smtp.gmail.com');
    setSmtpPort(465);
    if (!name) setName('Gmail Real Sender');
    if (!fromEmail && smtpUser) setFromEmail(smtpUser);
    setTestFeedback(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sender) return;

    setSaving(true);
    setSaveFeedback(null);

    try {
      const res = await fetch(`${API_BASE}/senders/${sender.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          fromEmail,
          smtpHost: isEthereal ? null : smtpHost,
          smtpPort: isEthereal ? null : Number(smtpPort),
          smtpUser: isEthereal ? null : smtpUser,
          smtpPass: isEthereal ? null : smtpPass,
          isEthereal,
          maxPerHour: Number(maxPerHour),
          minDelayMs: Number(minDelayMs),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSender(json.data);
        setSaveFeedback({ type: 'success', message: 'Sender settings saved successfully!' });
      } else {
        setSaveFeedback({ type: 'error', message: json.error?.message || 'Failed to save settings' });
      }
    } catch (err: any) {
      setSaveFeedback({ type: 'error', message: err.message || 'Network error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestFeedback(null);

    try {
      const res = await fetch(`${API_BASE}/senders/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: isEthereal ? null : smtpHost,
          smtpPort: isEthereal ? null : Number(smtpPort),
          smtpUser: isEthereal ? null : smtpUser,
          smtpPass: isEthereal ? null : smtpPass,
          isEthereal,
          testRecipient: testRecipient.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTestFeedback({ type: 'success', message: json.message || 'SMTP Connection Verified Successfully!' });
      } else {
        setTestFeedback({ type: 'error', message: json.message || 'SMTP Connection Test Failed' });
      }
    } catch (err: any) {
      setTestFeedback({ type: 'error', message: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading sender configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">System Settings & Real Sender Configuration</h1>
        <p className="text-xs text-slate-400">Configure Gmail API, real SMTP credentials, rate limits, and authentication</p>
      </div>

      {saveFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {saveFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{saveFeedback.message}</span>
        </div>
      )}

      {/* Mode Selection Card */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Outbound Email Engine Mode</h2>
                <p className="text-xs text-slate-400">Choose between real email delivery (Gmail / SMTP) or Ethereal Sandbox</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyGmailPreset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-semibold transition"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              Quick Gmail Setup
            </button>
          </div>

          {/* Mode Switch Radio Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div
              onClick={() => setIsEthereal(false)}
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                !isEthereal
                  ? 'bg-indigo-950/40 border-indigo-500/60 text-white shadow-md'
                  : 'bg-slate-900/40 border-border/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Real Email Mode (Gmail / SMTP)</span>
                <input
                  type="radio"
                  name="mode"
                  checked={!isEthereal}
                  onChange={() => setIsEthereal(false)}
                  className="accent-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Dispatches live emails directly to real inboxes using Gmail API / SMTP credentials.
              </p>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                Recommended for Production
              </span>
            </div>

            <div
              onClick={() => setIsEthereal(true)}
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                isEthereal
                  ? 'bg-amber-950/40 border-amber-500/60 text-white shadow-md'
                  : 'bg-slate-900/40 border-border/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Ethereal Sandbox Mode</span>
                <input
                  type="radio"
                  name="mode"
                  checked={isEthereal}
                  onChange={() => setIsEthereal(true)}
                  className="accent-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Simulates email dispatch and generates web preview URLs without delivering real emails.
              </p>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
                Testing / Development
              </span>
            </div>
          </div>

          {/* Profile & SMTP Credentials Form */}
          <div className="space-y-4 pt-2 border-t border-border/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Sender Identity Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Sales Team"
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">From Email Address</label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="e.g. user@gmail.com"
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {!isEthereal && (
              <>
                <div className="flex items-center justify-between pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">SMTP Server & Authentication</h3>
                  <button
                    type="button"
                    onClick={() => setShowGmailHelp(!showGmailHelp)}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    How to get Gmail App Password?
                  </button>
                </div>

                {showGmailHelp && (
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-xs text-slate-300 space-y-2">
                    <p className="font-bold text-indigo-300">How to configure Gmail SMTP with an App Password:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                      <li>Go to your Google Account Security settings: <strong>myaccount.google.com/security</strong></li>
                      <li>Ensure <strong>2-Step Verification</strong> is enabled on your Google Account.</li>
                      <li>Search for <strong>"App passwords"</strong> in the search bar.</li>
                      <li>Create an app password named <em>MailOrchestrator</em> and copy the 16-character password generated.</li>
                      <li>Set <strong>SMTP Host</strong> to <code className="text-indigo-300">smtp.gmail.com</code>, <strong>Port</strong> to <code className="text-indigo-300">465</code>, <strong>Username</strong> to your Gmail address, and paste the App Password below.</li>
                    </ol>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">SMTP Host</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      required={!isEthereal}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">SMTP Port</label>
                    <select
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    >
                      <option value={465}>465 (Gmail SSL)</option>
                      <option value={587}>587 (TLS / STARTTLS)</option>
                      <option value={25}>25 (Standard SMTP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">SMTP Username / Gmail Address</label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => {
                        setSmtpUser(e.target.value);
                        if (!fromEmail) setFromEmail(e.target.value);
                      }}
                      placeholder="your.email@gmail.com"
                      required={!isEthereal}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">SMTP Password / Gmail App Password</label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="••••••••••••••••"
                      required={!isEthereal}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Rate Limits */}
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Sending Controls & Rate Limiting</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Max Emails Per Hour</label>
                  <input
                    type="number"
                    value={maxPerHour}
                    onChange={(e) => setMaxPerHour(Number(e.target.value))}
                    min={1}
                    max={10000}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Minimum Spacing Delay (ms)</label>
                  <input
                    type="number"
                    value={minDelayMs}
                    onChange={(e) => setMinDelayMs(Number(e.target.value))}
                    min={0}
                    step={50}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Sender Profile'}
            </button>
          </div>
        </div>
      </form>

      {/* Live Connection & Test Email Sender */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-lg space-y-4">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Test Connection & Send Verification Email</h2>
            <p className="text-xs text-slate-400">Verify SMTP credentials live by testing connection or dispatching a test email</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="Optional test email recipient (e.g. target@example.com)"
              className="flex-1 w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-border/80 text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full sm:w-auto px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {testing ? 'Testing Connection...' : 'Test Connection'}
            </button>
          </div>

          {testFeedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                testFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="font-mono text-[11px] leading-relaxed break-all">{testFeedback.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Security Info */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-lg space-y-4">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2.5 rounded-xl bg-accent-cyan/10 text-accent-cyan">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Authentication & Security Tokens</h2>
            <p className="text-xs text-slate-400">JWT cookies, CORS policies, and rate limits</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-border/40">
            <div>
              <span className="font-semibold text-white block">Google OAuth Provider</span>
              <span className="text-[11px] text-slate-400">JWT Session Cookie Enabled</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold">Active</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-border/40">
            <div>
              <span className="font-semibold text-white block">API Express Rate Limiter</span>
              <span className="text-[11px] text-slate-400">10,000 requests per 15-minute window</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
