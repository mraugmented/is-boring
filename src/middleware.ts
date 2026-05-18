import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && !error.message.includes('Auth session missing')) {
      console.error('Middleware auth error:', error.message);
    }

    const pathname = request.nextUrl.pathname;

    // Protect /portal routes
    if (pathname.startsWith('/portal') && !pathname.startsWith('/portal/login')) {
      if (!user) {
        return NextResponse.redirect(new URL('/portal/login', request.url));
      }
    }

    // Protect /admin routes
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
      if (!user) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    }
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Lock')) {
      console.error('Middleware unexpected error:', err.message);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
