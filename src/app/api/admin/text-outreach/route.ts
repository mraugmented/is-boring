import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { phone, businessName, previewUrl, prospectLeadId } = await request.json();

  if (!phone || !businessName) {
    return NextResponse.json({ error: 'Missing phone or businessName' }, { status: 400 });
  }

  // Format phone for Sendblue (needs +1 prefix)
  let formattedPhone = phone.replace(/[^0-9]/g, '');
  if (formattedPhone.length === 10) formattedPhone = '1' + formattedPhone;
  if (!formattedPhone.startsWith('+')) formattedPhone = '+' + formattedPhone;

  const message = previewUrl
    ? `Hey! I came across ${businessName} and noticed you don't have a website — so I built one for you. No strings attached, just wanted to show you what's possible. Check it out: ${previewUrl} — Justyn from is-boring`
    : `Hey! I came across ${businessName} and noticed you don't have a website yet. We build and manage websites for local businesses like yours. Would you be interested in seeing what we could put together? — Justyn from is-boring`;

  // Send via Sendblue
  try {
    const res = await fetch('https://api.sendblue.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sb-api-key-id': process.env.SENDBLUE_API_KEY!,
        'sb-api-secret-key': process.env.SENDBLUE_SECRET_KEY!,
      },
      body: JSON.stringify({
        number: formattedPhone,
        content: message,
        from_number: process.env.SENDBLUE_FROM_NUMBER!,
      }),
    });

    const data = await res.json();

    if (data.error_message) {
      return NextResponse.json({ error: data.error_message }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Mark prospect_lead as contacted
    if (prospectLeadId) {
      await supabase
        .from('prospect_leads')
        .update({ status: 'contacted' })
        .eq('id', prospectLeadId);
    }

    // Log activity
    await supabase.from('activity_log').insert({
      actor: 'justyn',
      action: 'text_sent',
      details: `iMessage sent to ${businessName} at ${phone}${previewUrl ? ' with preview link' : ''}`,
    });

    return NextResponse.json({
      ok: true,
      messageId: data.message_handle,
      status: data.status,
    });
  } catch (err) {
    console.error('Sendblue error:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
