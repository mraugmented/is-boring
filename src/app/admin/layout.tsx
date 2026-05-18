import { redirect } from 'next/navigation';
import { getUserProfile, getUser, createSupabaseServerClient } from '@/lib/supabase-server';
import AdminLayoutClient from '@/components/admin/AdminLayoutClient';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect('/admin/login');
  }

  const profile = await getUserProfile();
  const isAdmin =
    profile?.role === 'admin' ||
    user.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    redirect('/admin/login');
  }

  // Fetch counts for sidebar badges
  const supabase = await createSupabaseServerClient();

  const [
    { count: clientCount },
    { count: siteCount },
    { count: pendingRequestCount },
    { count: unreadMessageCount },
    { count: unreadContactCount },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('client_sites').select('*', { count: 'exact', head: true }),
    supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'in_progress']),
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('sender_role', 'client'),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false),
  ]);

  const counts = {
    clients: clientCount ?? 0,
    sites: siteCount ?? 0,
    requests: pendingRequestCount ?? 0,
    messages: unreadMessageCount ?? 0,
    contacts: unreadContactCount ?? 0,
  };

  return <AdminLayoutClient counts={counts}>{children}</AdminLayoutClient>;
}
