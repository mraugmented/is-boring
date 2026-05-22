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

function buildEmail(data: {
  contactName: string;
  companyName: string;
  previewUrl: string;
  customMessage?: string;
}) {
  const { contactName, companyName, previewUrl, customMessage } = data;
  const firstName = contactName.split(' ')[0];

  const defaultMessage = `I came across ${companyName} and noticed you don't have a website yet — so instead of just reaching out, I went ahead and built one for you.`;

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
      <p style="margin:0 0 16px;">Hey ${firstName},</p>

      <p style="margin:0 0 16px;">${customMessage || defaultMessage}</p>

      <p style="margin:0 0 24px;">Take a look:</p>
    </div>

    <a href="${previewUrl}" style="display:block;margin-bottom:24px;text-decoration:none;">
      <img src="https://image.thum.io/get/width/1200/crop/900/noanimate/${previewUrl}" alt="Preview of your new website" style="width:100%;border-radius:12px;border:1px solid rgba(255,255,255,0.1);" />
    </a>

    <a href="${previewUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:24px;">
      View Live Site
    </a>

    <div style="color:rgba(255,255,255,0.4);font-size:14px;line-height:1.7;margin-top:24px;">
      <p style="margin:0 0 16px;">No strings attached — just wanted to show you what's possible. If you like what you see, I'd love to chat about getting this live for ${companyName}.</p>

      <p style="margin:0;">Just reply to this email and we'll go from there.</p>
    </div>

    <div style="margin-top:40px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="margin:0;color:rgba(255,255,255,0.5);font-size:14px;">Justyn</p>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.2);font-size:12px;font-family:monospace;">is-boring — we do the boring so you can keep on growing</p>
    </div>

  </div>
</body>
</html>`;

  const text = `Hey ${firstName},

${customMessage || defaultMessage}

Take a look: ${previewUrl}

No strings attached — just wanted to show you what's possible. If you like what you see, I'd love to chat about getting this live for ${companyName}.

Just reply to this email and we'll go from there.

Justyn
is-boring — we do the boring so you can keep on growing`;

  return { html, text };
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { contactName, contactEmail, companyName, previewUrl, customMessage, plan, phone } = body;

  if (!contactName || !contactEmail || !companyName || !previewUrl) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // Create prospect in DB — status is outreach_sent since we're sending the email
  const { data: client, error: dbError } = await supabase
    .from('clients')
    .insert({
      company_name: companyName,
      contact_name: contactName,
      contact_email: contactEmail,
      phone: phone || null,
      plan: plan || 'starter',
      status: 'outreach_sent',
      pipeline_stage_changed_at: new Date().toISOString(),
      preview_url: previewUrl,
      outreach_message: customMessage || null,
      outreach_sent_at: new Date().toISOString(),
      monthly_rate: plan === 'enterprise' ? 250000 : plan === 'growth' ? 100000 : 15000,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Log activity
  await supabase.from('activity_log').insert({
    client_id: client.id,
    actor: 'justyn',
    action: 'outreach_sent',
    details: `Outreach email sent to ${contactEmail} for ${companyName}`,
  });

  // Mark the prospect_lead as contacted (if it came from the scraper)
  await supabase
    .from('prospect_leads')
    .update({ status: 'contacted' })
    .eq('business_name', companyName)
    .eq('status', 'new');

  // Send email
  const { html, text } = buildEmail({ contactName, companyName, previewUrl, customMessage });

  try {
    await transporter.sendMail({
      from: `"Justyn from is-boring" <${process.env.GMAIL_USER}>`,
      to: contactEmail,
      subject: `I built something for ${companyName}`,
      text,
      html,
    });
  } catch (emailError) {
    // Update client to note email failed
    console.error('Email send failed:', emailError);
    return NextResponse.json(
      { client, emailSent: false, error: 'Prospect saved but email failed to send' },
      { status: 207 }
    );
  }

  return NextResponse.json({ client, emailSent: true });
}
