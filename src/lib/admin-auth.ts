import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from './supabase-server';
import { checkRateLimit, getClientIP, RATE_LIMITS, type RateLimitConfig } from './rate-limit';
import type { User } from '@supabase/supabase-js';

interface AdminAuthSuccess {
  user: User;
  error?: never;
  status?: never;
}

interface AdminAuthError {
  user?: never;
  error: string;
  status: number;
}

type AdminAuthResult = AdminAuthSuccess | AdminAuthError;

export async function verifyAdmin(
  request: NextRequest,
  rateLimit: RateLimitConfig = RATE_LIMITS.standard
): Promise<AdminAuthResult> {
  const ip = getClientIP(request);
  const rl = checkRateLimit(`admin:${ip}`, rateLimit);
  if (!rl.success) {
    return { error: 'Too many requests', status: 429 };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Check profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    // Fallback to env var check
    const adminEmail = process.env.ADMIN_EMAIL || '';
    if (!adminEmail || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
      return { error: 'Forbidden', status: 403 };
    }
  }

  return { user };
}
