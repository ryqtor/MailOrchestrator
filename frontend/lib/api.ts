import { EmailCampaign, ScheduledEmailItem, SystemMetrics } from '../types';

const getApiBase = () => {
  let raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }
  return raw.replace(/\/$/, '');
};

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const apiBase = getApiBase();
  const url = `${apiBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Server response error (${res.status}): ${text.slice(0, 120)}`);
  }

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'API request failed');
  }

  return json;
}

export const api = {
  getMetrics: () => fetchApi<{ success: true; data: SystemMetrics }>('/api/metrics'),

  getCampaigns: (status?: string, page = 1) =>
    fetchApi<{
      success: true;
      data: EmailCampaign[];
      pagination: { total: number; page: number; pages: number };
    }>(`/api/campaigns?page=${page}${status ? `&status=${status}` : ''}`),

  getCampaignById: (id: string) =>
    fetchApi<{
      success: true;
      data: EmailCampaign & {
        recipients: Array<{
          id: string;
          email: string;
          status: string;
          sentAt?: string;
          errorMessage?: string;
          metadataJson?: Record<string, unknown>;
        }>;
      };
    }>(`/api/campaigns/${id}`),

  createCampaign: (data: {
    title: string;
    subject: string;
    bodyTemplate: string;
    scheduledAt?: string;
    recipients: Array<{ email: string; name?: string; company?: string }>;
  }) =>
    fetchApi<{ success: true; data: EmailCampaign }>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadCampaignCSV: async (formData: FormData) => {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/api/campaigns/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, error: { message: `Upload error (${res.status}): ${text.slice(0, 100)}` } };
    }
  },

  getScheduledEmails: (page = 1) =>
    fetchApi<{ success: true; data: ScheduledEmailItem[]; pagination: { total: number } }>(
      `/api/emails/scheduled?page=${page}`
    ),

  getSentEmails: (page = 1) =>
    fetchApi<{ success: true; data: ScheduledEmailItem[]; pagination: { total: number } }>(
      `/api/emails/sent?page=${page}`
    ),
};
