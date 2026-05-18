import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('Supabase browser client can only be created in browser');
  }

  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials not available');
  }

  client = createBrowserClient(url, key, {
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax',
      secure: true,
    },
  });

  return client;
}
