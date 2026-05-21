import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rateCheck = checkRateLimit(`leads:${ip}`, RATE_LIMITS.leads);

  if (!rateCheck.success) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: corsHeaders }
    );
  }

  let body: {
    site_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    business_name?: string;
    message?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid JSON' },
      { status: 400, headers: corsHeaders }
    );
  }

  const { site_id, name, email, phone, business_name, message } = body;

  if (!site_id || !email) {
    return Response.json(
      { error: 'Missing required fields: site_id, email' },
      { status: 400, headers: corsHeaders }
    );
  }

  const supabase = getServiceClient();

  const { error } = await supabase.from('site_leads').insert({
    site_id,
    name: name || null,
    email,
    phone: phone || null,
    business_name: business_name || null,
    message: message || null,
  });

  if (error) {
    console.error('Lead insert error:', error);
    return Response.json(
      { error: 'Failed to save lead' },
      { status: 500, headers: corsHeaders }
    );
  }

  return Response.json({ ok: true }, { headers: corsHeaders });
}
