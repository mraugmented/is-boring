import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getUser } from '@/lib/supabase-server';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { data: agreement } = await supabase
    .from('service_agreements')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ agreement: agreement ?? null });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: client } = await supabase
    .from('clients')
    .select('id, plan, monthly_rate, monthly_change_limit')
    .eq('user_id', user.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const body = await request.json();
  const { signer_name, signer_email } = body;

  if (!signer_name || !signer_email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
  }

  const ipAddress = request.headers.get('x-forwarded-for');
  const userAgent = request.headers.get('user-agent');

  const { data: agreement, error: insertError } = await supabase
    .from('service_agreements')
    .insert({
      client_id: client.id,
      signer_name,
      signer_email,
      plan: client.plan,
      monthly_rate: client.monthly_rate,
      monthly_change_limit: client.monthly_change_limit,
      signed_at: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      agreement_version: '1.0',
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update client record
  await supabase
    .from('clients')
    .update({ agreement_signed_at: new Date().toISOString() })
    .eq('id', client.id);

  // Log activity
  await supabase.from('activity_log').insert({
    client_id: client.id,
    actor: user.id,
    action: `Service agreement signed by ${signer_name}`,
    metadata: {},
  });

  return NextResponse.json({ agreement });
}
