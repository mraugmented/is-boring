import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

const ALLOWED_EVENTS = [
  'page_view',
  'click',
  'form_submit',
  'scroll_depth',
  'session_start',
  'session_end',
] as const;

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
  const rateCheck = checkRateLimit(`track:${ip}`, RATE_LIMITS.relaxed);

  if (!rateCheck.success) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: corsHeaders }
    );
  }

  let body: {
    site_id?: string;
    session_id?: string;
    event_type?: string;
    event_data?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid JSON' },
      { status: 400, headers: corsHeaders }
    );
  }

  const { site_id, session_id, event_type, event_data } = body;

  if (!site_id || !session_id || !event_type) {
    return Response.json(
      { error: 'Missing required fields: site_id, session_id, event_type' },
      { status: 400, headers: corsHeaders }
    );
  }

  if (!ALLOWED_EVENTS.includes(event_type as (typeof ALLOWED_EVENTS)[number])) {
    return Response.json(
      { error: `Invalid event_type. Allowed: ${ALLOWED_EVENTS.join(', ')}` },
      { status: 400, headers: corsHeaders }
    );
  }

  const supabase = getServiceClient();

  const { error } = await supabase.from('client_analytics').insert({
    site_id,
    session_id,
    event_type,
    event_data: event_data ?? {},
  });

  if (error) {
    console.error('Analytics insert error:', error);
    return Response.json(
      { error: 'Failed to record event' },
      { status: 500, headers: corsHeaders }
    );
  }

  return Response.json({ ok: true }, { headers: corsHeaders });
}
