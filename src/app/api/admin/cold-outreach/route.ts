import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function buildColdEmail(data: {
  businessName: string;
  contactName?: string;
}) {
  const { businessName, contactName } = data;
  const greeting = contactName ? `Hi ${contactName.split(' ')[0]}` : 'Hi there';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">

    <div style="margin-bottom:32px;">
      <img src="https://is-boring.com/logo.jpeg" alt="is-boring" height="36" style="height:36px;width:auto;" />
    </div>

    <div style="color:#ededed;font-size:15px;line-height:1.7;">
      <p style="margin:0 0 16px;">${greeting},</p>

      <p style="margin:0 0 16px;">My name is Justyn — I run a small web design studio here in LA called <strong>is-boring</strong>. We work with local businesses to build clean, modern websites that actually bring in customers.</p>

      <p style="margin:0 0 16px;">I came across <strong>${businessName}</strong> and thought you might be interested in leveling up your online presence. Whether you need a brand new site or a fresh update to what you have — we'd love to help.</p>

      <p style="margin:0 0 16px;">We're a small, local team — not some big agency. We get what matters for businesses like yours: looking professional, showing up on Google, and making it easy for people to reach you.</p>

      <p style="margin:0 0 16px;"><strong>Here's what I'd like to offer:</strong> I'll build you a free prototype of what your new site could look like — no strings attached. If you love it, we can talk next steps. If not, no hard feelings at all.</p>

      <p style="margin:0 0 24px;">Would you be open to a quick chat? Just reply here or text me anytime.</p>
    </div>

    <a href="https://earthisboring.com" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:24px;">
      See Our Work
    </a>

    <div style="margin-top:40px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="margin:0;color:rgba(255,255,255,0.5);font-size:14px;">Justyn</p>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.3);font-size:13px;">Founder, is-boring</p>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.2);font-size:12px;font-family:monospace;">we do the boring so you can keep on growing</p>
    </div>

  </div>
</body>
</html>`;

  const text = `${greeting},

My name is Justyn — I run a small web design studio here in LA called is-boring. We work with local businesses to build clean, modern websites that actually bring in customers.

I came across ${businessName} and thought you might be interested in leveling up your online presence. Whether you need a brand new site or a fresh update to what you have — we'd love to help.

We're a small, local team — not some big agency. We get what matters for businesses like yours: looking professional, showing up on Google, and making it easy for people to reach you.

Here's what I'd like to offer: I'll build you a free prototype of what your new site could look like — no strings attached. If you love it, we can talk next steps. If not, no hard feelings at all.

Would you be open to a quick chat? Just reply here or text me anytime.

See our work: https://earthisboring.com

Justyn
Founder, is-boring
we do the boring so you can keep on growing`;

  return { html, text };
}

// Single send
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { email, businessName, contactName, leadId } = body;

  if (!email || !businessName) {
    return NextResponse.json({ error: 'Missing email or businessName' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { html, text } = buildColdEmail({ businessName, contactName });

  try {
    await transporter.sendMail({
      from: `"Justyn from is-boring" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Quick question about ${businessName}`,
      text,
      html,
    });
  } catch (err) {
    console.error('Cold outreach email failed:', err);
    return NextResponse.json({ error: 'Email failed to send' }, { status: 500 });
  }

  // Mark lead as contacted if leadId provided
  if (leadId) {
    await supabase
      .from('prospect_leads')
      .update({ status: 'contacted' })
      .eq('id', leadId);
  }

  // Log activity
  await supabase.from('activity_log').insert({
    actor: 'justyn',
    action: 'cold_outreach_sent',
    details: `Cold outreach sent to ${email} (${businessName})`,
  });

  return NextResponse.json({ sent: true, email, businessName });
}
