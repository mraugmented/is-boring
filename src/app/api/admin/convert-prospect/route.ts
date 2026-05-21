import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function buildInviteEmail(data: {
  contactName: string;
  companyName: string;
  portalUrl: string;
  email: string;
  password: string;
}) {
  const { contactName, companyName, portalUrl, email, password } = data;
  const firstName = contactName.split(' ')[0];

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
      <span style="font-size:14px;font-weight:600;color:rgba(255,255,255,0.6);font-family:monospace;">
        is-boring<span style="color:#a78bfa;">.</span>
      </span>
    </div>

    <div style="color:#ededed;font-size:15px;line-height:1.7;">
      <p style="margin:0 0 16px;">Hey ${firstName},</p>

      <p style="margin:0 0 16px;">Welcome aboard! Your client portal is ready. From here you can track your site, submit change requests, and message us directly.</p>
    </div>

    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 12px;color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Your Login</p>
      <p style="margin:0 0 8px;color:#ededed;font-size:14px;"><strong>Email:</strong> ${email}</p>
      <p style="margin:0;color:#ededed;font-size:14px;"><strong>Password:</strong> <code style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;font-family:monospace;">${password}</code></p>
    </div>

    <a href="${portalUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:24px;">
      Sign In to Your Portal
    </a>

    <div style="color:rgba(255,255,255,0.4);font-size:14px;line-height:1.7;margin-top:24px;">
      <p style="margin:0 0 16px;">In your portal you can:</p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        <li>View your site status and deployment info</li>
        <li>Submit change requests and track their progress</li>
        <li>Message the is-boring team directly</li>
      </ul>
      <p style="margin:0;">We're handling the boring stuff for ${companyName} so you can keep on growing.</p>
    </div>

    <div style="margin-top:40px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="margin:0;color:rgba(255,255,255,0.5);font-size:14px;">Justyn</p>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.2);font-size:12px;font-family:monospace;">is-boring — we do the boring so you can keep on growing</p>
    </div>

  </div>
</body>
</html>`;

  const text = `Hey ${firstName},

Welcome aboard! Your client portal is ready.

Your Login:
Email: ${email}
Password: ${password}

Sign in here: ${portalUrl}

In your portal you can:
- View your site status and deployment info
- Submit change requests and track their progress
- Message the is-boring team directly

We're handling the boring stuff for ${companyName} so you can keep on growing.

Justyn
is-boring — we do the boring so you can keep on growing`;

  return { html, text };
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { clientId } = await request.json();
  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  if (!client.contact_email) {
    return NextResponse.json({ error: 'Client has no email address' }, { status: 400 });
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let userId: string;
  const tempPassword = generatePassword();

  // Check if user already exists
  const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === client.contact_email.toLowerCase()
  );

  if (existingUser) {
    userId = existingUser.id;
    // Reset their password to the new temp one
    await serviceClient.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });
  } else {
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email: client.contact_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        display_name: client.contact_name || client.company_name,
      },
    });

    if (createError || !newUser.user) {
      return NextResponse.json(
        { error: `Failed to create user: ${createError?.message}` },
        { status: 500 }
      );
    }

    userId = newUser.user.id;
  }

  // Link client record to auth user + set active
  const { error: updateError } = await supabase
    .from('clients')
    .update({
      user_id: userId,
      status: 'active',
    })
    .eq('id', clientId);

  if (updateError) {
    return NextResponse.json(
      { error: `Failed to update client: ${updateError.message}` },
      { status: 500 }
    );
  }

  await serviceClient
    .from('profiles')
    .update({ role: 'client' })
    .eq('id', userId);

  // Send invite email with credentials
  const portalUrl = 'https://is-boring.com/portal/login';
  const { html, text } = buildInviteEmail({
    contactName: client.contact_name || client.company_name,
    companyName: client.company_name,
    portalUrl,
    email: client.contact_email,
    password: tempPassword,
  });

  try {
    await transporter.sendMail({
      from: `"Justyn from is-boring" <${process.env.GMAIL_USER}>`,
      to: client.contact_email,
      subject: `Your is-boring portal is ready`,
      text,
      html,
    });
  } catch (emailError) {
    console.error('Invite email failed:', emailError);
    return NextResponse.json({
      message: `Client activated but invite email failed. Their temp password is: ${tempPassword}`,
      emailSent: false,
      tempPassword,
    });
  }

  return NextResponse.json({
    message: `${client.company_name} is now active! Login credentials sent to ${client.contact_email}.`,
    emailSent: true,
  });
}
