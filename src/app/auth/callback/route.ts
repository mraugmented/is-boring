import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function sanitizeRedirect(next: string, origin: string): string {
  try {
    if (next.startsWith('//') || next.startsWith('\\')) return '/portal';
    if (next.includes('://')) return '/portal';
    const url = new URL(next, origin);
    if (url.origin !== origin) return '/portal';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/portal';
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = sanitizeRedirect(searchParams.get('next') ?? '/portal', origin);

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore errors from Server Components
          }
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('Code exchange error:', error.message);
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'magiclink',
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('OTP verification error:', error.message);
  }

  return NextResponse.redirect(`${origin}/portal/login?error=true`);
}
