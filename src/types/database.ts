export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  role: 'admin' | 'client';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type PipelineStage =
  | 'prospect'
  | 'outreach_sent'
  | 'replied'
  | 'meeting_booked'
  | 'closed_won'
  | 'closed_lost'
  | 'active'
  | 'inactive'
  | 'onboarding';

export type PaymentStatus = 'none' | 'trial' | 'paid' | 'overdue' | 'cancelled';

export interface Client {
  id: string;
  user_id: string | null;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  plan: 'starter' | 'growth' | 'enterprise';
  status: PipelineStage;
  notes: string | null;
  preview_url: string | null;
  outreach_sent_at: string | null;
  outreach_message: string | null;
  monthly_rate: number;
  payment_status: PaymentStatus;
  billing_start_date: string | null;
  last_payment_date: string | null;
  pipeline_stage_changed_at: string | null;
  lost_reason: string | null;
  agreement_signed_at: string | null;
  monthly_change_limit: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceAgreement {
  id: string;
  client_id: string;
  signer_name: string;
  signer_email: string;
  plan: string;
  monthly_rate: number;
  monthly_change_limit: number;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  agreement_version: string;
  created_at: string;
}

export interface ClientSite {
  id: string;
  client_id: string;
  site_name: string;
  domain: string | null;
  vercel_project_id: string | null;
  template: string | null;
  status: 'live' | 'development' | 'maintenance' | 'offline';
  last_deploy_at: string | null;
  last_deploy_status: string | null;
  tech_stack: string | null;
  created_at: string;
  updated_at: string;
}

export interface Request {
  id: string;
  client_id: string;
  site_id: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  client_id: string;
  request_id: string | null;
  sender_id: string;
  sender_role: 'admin' | 'client';
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  client_id: string | null;
  actor: string;
  action: string;
  details: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SiteAnalytics {
  id: string;
  site_id: string;
  date: string;
  page_views: number;
  unique_visitors: number;
  top_pages: { path: string; views: number }[];
  created_at: string;
}

export interface ClientFile {
  id: string;
  client_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  notes: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  name: string | null;
  email: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

// Plan pricing in cents
export const PLAN_PRICING: Record<string, number> = {
  starter: 50000,   // $500/mo
  growth: 100000,   // $1,000/mo
  enterprise: 250000, // $2,500/mo
};

// Pipeline stage display order
export const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: 'prospect', label: 'Prospect' },
  { key: 'outreach_sent', label: 'Outreach Sent' },
  { key: 'replied', label: 'Replied' },
  { key: 'meeting_booked', label: 'Meeting Booked' },
  { key: 'closed_won', label: 'Closed Won' },
  { key: 'closed_lost', label: 'Closed Lost' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];
