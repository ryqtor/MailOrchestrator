'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Mail, Server, CheckCircle2, AlertCircle, RefreshCw, Send, HelpCircle, Zap } from 'lucide-react';
import { EmailSender } from '@/types';

const getApiBase = () => {
  let raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }
  return raw.replace(/\/$/, '');
};

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
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/senders/default`, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch { return; }
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
    setSmtpPort(587);
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
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/senders/${sender.id}`, {
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

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Server response error (${res.status}): ${text.slice(0, 120)}`);
      }

      if (res.ok && json.success) {
        setSender(json.data);
        setSaveFeedback({ type: 'success', message: 'Sender settings saved successfully!' });
      } else {
        setSaveFeedback({ type: 'error', message: json.message || json.error?.message || 'Failed to save settings' });
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
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/senders/test`, {
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

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Server returned error status (${res.status}): ${text.slice(0, 120)}`);
      }

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
      <div className="flex items-center justify-center min-h-[400px] text-[#6B6B6B] font-mono text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-[#A34A22]" />
        Loading sender configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12 font-sans">
      {/* Page Header */}
      <div className="border-b border-[#DDD8D1] pb-4">
        <h1 className="text-2xl font-serif font-semibold text-[#1F1F1F] tracking-tight">
          System Settings & Real Sender Configuration
        </h1>
        <p className="text-xs text-[#6B6B6B] mt-1 font-sans">
          Configure Gmail API, real SMTP credentials, rate limits, and transport modes for cold outreach.
        </p>
      </div>

      {saveFeedback && (
        <div
          className={`p-3.5 rounded-lg border flex items-center gap-3 text-xs font-mono ${
            saveFeedback.type === 'success'
              ? 'bg-[#FAF8F5] border-[#1B7F4B] text-[#1B7F4B]'
              : 'bg-[#FAF8F5] border-[#B42318] text-[#B42318]'
          }`}
        >
          {saveFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4.5 h-4.5 text-[#1B7F4B] shrink-0" />
          ) : (
            <AlertCircle className="w-4.5 h-4.5 text-[#B42318] shrink-0" />
          )}
          <span>{saveFeedback.message}</span>
        </div>
      )}

      {/* Mode Selection Card */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-xl bg-[#FFFFFF] border border-[#DDD8D1] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#DDD8D1] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#A34A22]">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-serif font-semibold text-[#1F1F1F]">Outbound Email Engine Mode</h2>
                <p className="text-xs text-[#6B6B6B]">Choose between real email delivery (Gmail / SMTP) or Ethereal Sandbox</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyGmailPreset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#A34A22]/10 text-[#A34A22] border border-[#A34A22]/30 hover:bg-[#A34A22]/20 text-xs font-mono font-semibold transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-[#A34A22]" />
              Quick Gmail Setup
            </button>
          </div>

          {/* Mode Switch Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div
              onClick={() => setIsEthereal(false)}
              className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                !isEthereal
                  ? 'bg-[#FAF8F5] border-[#A34A22] shadow-xs'
                  : 'bg-[#FFFFFF] border-[#DDD8D1] text-[#6B6B6B] hover:border-[#A34A22]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-[#1F1F1F]">Real Email Mode (Gmail / SMTP)</span>
                <input
                  type="radio"
                  name="mode"
                  checked={!isEthereal}
                  onChange={() => setIsEthereal(false)}
                  className="accent-[#A34A22]"
                />
              </div>
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                Dispatches live emails directly to real inboxes using your Gmail API / SMTP credentials.
              </p>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold bg-[#1B7F4B]/10 text-[#1B7F4B] border border-[#1B7F4B]/30 w-fit">
                Recommended for Production
              </span>
            </div>

            <div
              onClick={() => setIsEthereal(true)}
              className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                isEthereal
                  ? 'bg-[#FAF8F5] border-[#A34A22] shadow-xs'
                  : 'bg-[#FFFFFF] border-[#DDD8D1] text-[#6B6B6B] hover:border-[#A34A22]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-[#1F1F1F]">Ethereal Sandbox Mode</span>
                <input
                  type="radio"
                  name="mode"
                  checked={isEthereal}
                  onChange={() => setIsEthereal(true)}
                  className="accent-[#A34A22]"
                />
              </div>
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                Simulates email dispatch and generates web preview URLs without delivering real emails.
              </p>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold bg-[#FAF8F5] text-[#6B6B6B] border border-[#DDD8D1] w-fit">
                Testing / Sandbox
              </span>
            </div>
          </div>

          {/* Profile & Credentials */}
          <div className="space-y-4 pt-2 border-t border-[#DDD8D1]">
            <h3 className="editorial-label">Sender Identity Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-mono text-[11px] uppercase text-[#6B6B6B] mb-1 font-semibold">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Sales Team"
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] text-xs focus:outline-none focus:border-[#A34A22]"
                />
              </div>
              <div>
                <label className="block font-mono text-[11px] uppercase text-[#6B6B6B] mb-1 font-semibold">From Email Address</label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="e.g. user@gmail.com"
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] font-mono text-xs focus:outline-none focus:border-[#A34A22]"
                />
              </div>
            </div>

            {!isEthereal && (
              <>
                <div className="flex items-center justify-between pt-2">
                  <h3 className="editorial-label">SMTP Server & Authentication</h3>
                  <button
                    type="button"
                    onClick={() => setShowGmailHelp(!showGmailHelp)}
                    className="flex items-center gap-1 text-[11px] text-[#A34A22] hover:underline font-mono"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    How to get Gmail App Password?
                  </button>
                </div>

                {showGmailHelp && (
                  <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-xs text-[#1F1F1F] space-y-2">
                    <p className="font-bold text-[#A34A22]">How to configure Gmail SMTP with an App Password:</p>
                    <ol className="list-decimal list-inside space-y-1 text-[#6B6B6B] text-[11px]">
                      <li>Go to Google Account Security: <strong>myaccount.google.com/security</strong></li>
                      <li>Ensure <strong>2-Step Verification</strong> is enabled.</li>
                      <li>Search for <strong>"App passwords"</strong> in the top search bar.</li>
                      <li>Create an app password named <em>MailOrchestrator</em> and copy the 16-character code.</li>
                      <li>Set <strong>SMTP Host</strong> to <code className="text-[#A34A22]">smtp.gmail.com</code>, <strong>Port</strong> to <code className="text-[#A34A22]">465</code>, and paste the App Password below.</li>
                    </ol>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-mono text-[11px] uppercase text-[#6B6B6B] mb-1 font-semibold">SMTP Host</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      required={!isEthereal}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] font-mono text-xs focus:outline-none focus:border-[#A34A22]"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[11px] uppercase text-[#6B6B6B] mb-1 font-semibold">SMTP Port</label>
                    <select
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] font-mono text-xs focus:outline-none focus:border-[#A34A22]"
                    >
                      <option value={465}>465 (Gmail SSL)</option>
                      <option value={587}>587 (TLS / STARTTLS)</option>
                      <option value={25}>25 (Standard SMTP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[11px] uppercase text-[#6B6B6B] mb-1 font-semibold">SMTP Username / Gmail</label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => {
                        setSmtpUser(e.target.value);
                        if (!fromEmail) setFromEmail(e.target.value);
                      }}
                      placeholder="your.email@gmail.com"
                      required={!isEthereal}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] font-mono text-xs focus:outline-none focus:border-[#A34A22]"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[11px] uppercase text-[#6B6B6B] mb-1 font-semibold">SMTP / Gmail App Password</label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="••••••••••••••••"
                      required={!isEthereal}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] font-mono text-xs focus:outline-none focus:border-[#A34A22]"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Rate Limiting */}
            <div className="pt-2">
              <h3 className="editorial-label mb-3">Sending Controls & Rate Limiting</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-mono text-[11px] uppercase text-[#6B6B6B] mb-1 font-semibold">Max Emails Per Hour</label>
                  <input
                    type="number"
                    value={maxPerHour}
                    onChange={(e) => setMaxPerHour(Number(e.target.value))}
                    min={1}
                    max={10000}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] font-mono text-xs focus:outline-none focus:border-[#A34A22]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase text-[#6B6B6B] mb-1 font-semibold">Minimum Delay (ms)</label>
                  <input
                    type="number"
                    value={minDelayMs}
                    onChange={(e) => setMinDelayMs(Number(e.target.value))}
                    min={0}
                    step={50}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] font-mono text-xs focus:outline-none focus:border-[#A34A22]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DDD8D1]">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-[#A34A22] hover:bg-[#8c3d1b] text-white font-mono text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Sender Profile'}
            </button>
          </div>
        </div>
      </form>

      {/* Live Connection Test Module */}
      <div className="p-6 rounded-xl bg-[#FFFFFF] border border-[#DDD8D1] shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-[#DDD8D1] pb-4">
          <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1B7F4B]">
            <Send className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-serif font-semibold text-[#1F1F1F]">Test Connection & Send Verification Email</h2>
            <p className="text-xs text-[#6B6B6B]">Verify SMTP credentials live by testing connection or dispatching a test email</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="Optional test recipient email (e.g. target@example.com)"
              className="flex-1 w-full px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#1F1F1F] font-mono text-xs focus:outline-none focus:border-[#A34A22]"
            />
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full sm:w-auto px-5 py-2 rounded-lg bg-[#1B7F4B] hover:bg-[#15633a] text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 shadow-2xs"
            >
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {testing ? 'Testing Connection...' : 'Test Connection'}
            </button>
          </div>

          {testFeedback && (
            <div
              className={`p-3.5 rounded-lg border flex items-start gap-2.5 font-mono text-[11px] ${
                testFeedback.type === 'success'
                  ? 'bg-[#FAF8F5] border-[#1B7F4B] text-[#1B7F4B]'
                  : 'bg-[#FAF8F5] border-[#B42318] text-[#B42318]'
              }`}
            >
              {testFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#1B7F4B] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#B42318] shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed break-all">{testFeedback.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Security Token Details */}
      <div className="p-6 rounded-xl bg-[#FFFFFF] border border-[#DDD8D1] shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-[#DDD8D1] pb-4">
          <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1] text-[#A34A22]">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-serif font-semibold text-[#1F1F1F]">Authentication & Security Tokens</h2>
            <p className="text-xs text-[#6B6B6B]">JWT cookies, CORS policies, and rate limits</p>
          </div>
        </div>

        <div className="space-y-3 text-xs font-sans">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1]">
            <div>
              <span className="font-semibold text-[#1F1F1F] block">Google OAuth Provider</span>
              <span className="text-[11px] text-[#6B6B6B] font-mono">JWT Session Cookie Enabled</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1B7F4B]/10 text-[#1B7F4B] border border-[#1B7F4B]/30 text-[10px] font-mono font-bold uppercase">Active</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAF8F5] border border-[#DDD8D1]">
            <div>
              <span className="font-semibold text-[#1F1F1F] block">API Express Rate Limiter</span>
              <span className="text-[11px] text-[#6B6B6B] font-mono">10,000 requests per 15-minute window</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1B7F4B]/10 text-[#1B7F4B] border border-[#1B7F4B]/30 text-[10px] font-mono font-bold uppercase">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
