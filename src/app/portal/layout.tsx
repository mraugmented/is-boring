import { redirect } from 'next/navigation';
import { getUser, createSupabaseServerClient } from '@/lib/supabase-server';
import PortalShell from '@/components/portal/PortalShell';
import type { Client } from '@/types/database';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/portal/login');
  }

  const supabase = await createSupabaseServerClient();

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .single<Client>();

  if (!client) {
    redirect('/portal/login');
  }

  return <PortalShell client={client}>{children}</PortalShell>;
}
