import { EmailCampaign, ScheduledEmailItem, SystemMetrics } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'API request failed');
  }

  return json;
}

export const api = {
  getMetrics: () => fetchApi<{ success: true; data: SystemMetrics }>('/metrics'),

  getCampaigns: (status?: string, page = 1) =>
    fetchApi<{
      success: true;
      data: EmailCampaign[];
      pagination: { total: number; page: number; pages: number };
    }>(`/campaigns?page=${page}${status ? `&status=${status}` : ''}`),

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
    }>(`/campaigns/${id}`),

  createCampaign: (data: {
    title: string;
    subject: string;
    bodyTemplate: string;
    scheduledAt?: string;
    recipients: Array<{ email: string; name?: string; company?: string }>;
  }) =>
    fetchApi<{ success: true; data: EmailCampaign }>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadCampaignCSV: (formData: FormData) =>
    fetch(`${API_BASE}/campaigns/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }).then((res) => res.json()),

  getScheduledEmails: (page = 1) =>
    fetchApi<{ success: true; data: ScheduledEmailItem[]; pagination: { total: number } }>(
      `/emails/scheduled?page=${page}`
    ),

  getSentEmails: (page = 1) =>
    fetchApi<{ success: true; data: ScheduledEmailItem[]; pagination: { total: number } }>(
      `/emails/sent?page=${page}`
    ),
};
