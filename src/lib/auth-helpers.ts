import { createSupabaseServerClient } from './supabase-server';

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'client';
}

export async function verifyAuth(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email,
    displayName: profile?.display_name || undefined,
    role: profile?.role || 'client',
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await verifyAuth();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return user;
}
