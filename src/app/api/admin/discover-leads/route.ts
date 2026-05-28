import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// Target: mom-and-pop, local service businesses
const TARGET_CATEGORIES = [
  'small gym',
  'personal trainer',
  'plumber',
  'electrician',
  'beauty salon',
  'hair salon',
  'nail salon',
  'barber shop',
  'auto body shop',
  'landscaping',
  'cleaning service',
  'tattoo shop',
  'pet grooming',
  'handyman',
  'moving company',
  'massage therapist',
  'yoga studio',
  'carpet cleaning',
  'pressure washing',
  'florist',
  'bakery',
  'dog walker',
  'chiropractor',
  'veterinarian',
  'photographer',
  'catering',
  'tutoring',
  'dry cleaner',
  'tailor',
  'locksmith',
];

interface Business {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  rating?: number;
  reviews?: number;
}

async function searchSerpAPI(query: string): Promise<{ businesses: Business[]; debug?: string }> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return { businesses: [], debug: 'NO_API_KEY' };

  const params = new URLSearchParams({
    engine: 'google_maps',
    q: query,
    type: 'search',
    api_key: apiKey,
  });

  try {
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) {
      const text = await res.text();
      return { businesses: [], debug: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json();

    // Check for error in response
    if (data.error) {
      return { businesses: [], debug: `API error: ${data.error}` };
    }

    const results = data.local_results || [];
    return {
      businesses: results.map((r: Record<string, unknown>) => ({
        name: r.title as string,
        phone: r.phone as string | undefined,
        address: r.address as string | undefined,
        website: r.website as string | undefined,
        rating: r.rating as number | undefined,
        reviews: r.reviews as number | undefined,
      })),
      debug: results.length === 0 ? `No local_results. Keys: ${Object.keys(data).join(', ')}` : undefined,
    };
  } catch (err) {
    return { businesses: [], debug: `Fetch error: ${err}` };
  }
}

async function scrapeEmail(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(fullUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; is-boring-bot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = html.match(emailRegex) || [];
    const junk = ['example.com', 'wixpress', 'sentry.io', 'squarespace', 'wordpress', 'w3.org', 'schema.org', 'googleapis', 'google.com', 'facebook.com', 'twitter.com'];
    const valid = emails.filter(e => !junk.some(j => e.includes(j)));
    const preferred = valid.find(e =>
      e.startsWith('info@') || e.startsWith('contact@') || e.startsWith('sales@') ||
      e.startsWith('hello@') || e.startsWith('admin@') || e.startsWith('office@')
    );
    return preferred || valid[0] || null;
  } catch {
    return null;
  }
}

async function checkWebsite(url: string): Promise<{ exists: boolean; score: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(fullUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; is-boring-bot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return { exists: false, score: 0 };

    const html = await res.text();
    let score = 10;
    if (!html.includes('viewport')) score -= 3;
    if (!url.startsWith('https')) score -= 2;
    if (!(html.includes('__next') || html.includes('__nuxt') || html.includes('react') || html.includes('vue-app'))) score -= 1;
    if (html.includes('<table') && html.includes('bgcolor')) score -= 3;
    if (html.includes('Flash') || html.includes('.swf')) score -= 4;
    if (html.includes('wix.com') || html.includes('squarespace')) score -= 1;
    if (html.length < 2000) score -= 3;
    return { exists: true, score: Math.max(0, score) };
  } catch {
    return { exists: false, score: 0 };
  }
}

function scoreLead(biz: Business, websiteCheck: { exists: boolean; score: number }): number {
  let score = 0;
  if (!biz.website || !websiteCheck.exists) {
    score += 10;
  } else {
    score += Math.max(0, 7 - websiteCheck.score);
  }
  if (biz.reviews && biz.reviews > 10) score += 2;
  if (biz.reviews && biz.reviews > 50) score += 1;
  if (biz.rating && biz.rating >= 4.0) score += 1;
  if (biz.phone) score += 1;
  if (biz.email) score += 2;
  return score;
}

export const maxDuration = 300; // 5 min timeout on Vercel

// Single city + single category batch — called repeatedly from the frontend
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { city, category } = body;

  if (!city) {
    return NextResponse.json({ error: 'City is required' }, { status: 400 });
  }

  // If a single category is provided, search just that. Otherwise do a batch of 5.
  const categories = category
    ? [category]
    : TARGET_CATEGORIES;

  const supabase = await createSupabaseServerClient();
  let totalFound = 0;
  let totalSaved = 0;
  let totalEmails = 0;
  let searchesUsed = 0;

  const debugMessages: string[] = [];

  for (const cat of categories) {
    const query = `${cat} in ${city}`;
    const { businesses, debug } = await searchSerpAPI(query);
    searchesUsed++;
    totalFound += businesses.length;
    if (debug) debugMessages.push(`${cat}: ${debug}`);

    for (const biz of businesses) {
      let websiteCheck = { exists: false, score: 0 };

      if (biz.website) {
        const url = biz.website.startsWith('http') ? biz.website : `https://${biz.website}`;
        const [wc, email] = await Promise.all([checkWebsite(url), scrapeEmail(url)]);
        websiteCheck = wc;
        if (email) {
          biz.email = email;
          totalEmails++;
        }
      }

      const leadScore = scoreLead(biz, websiteCheck);
      if (leadScore < 5) continue;

      const { error } = await supabase.from('prospect_leads').upsert(
        {
          business_name: biz.name,
          category: cat,
          phone: biz.phone || null,
          email: biz.email || null,
          address: biz.address || null,
          city,
          website_url: biz.website || null,
          has_website: websiteCheck.exists,
          website_score: websiteCheck.score,
          review_count: biz.reviews || 0,
          rating: biz.rating || null,
          score: leadScore,
          source: 'google_maps',
          scraped_at: new Date().toISOString(),
        },
        { onConflict: 'business_name,address', ignoreDuplicates: true }
      );

      if (!error) totalSaved++;
    }

    // Rate limit between searches
    await new Promise(r => setTimeout(r, 1000));
  }

  // Log
  await supabase.from('activity_log').insert({
    actor: 'justyn',
    action: 'leads_discovered',
    details: `[${city}] Found ${totalFound}, saved ${totalSaved}, emails ${totalEmails}. Searches: ${searchesUsed}.`,
  });

  return NextResponse.json({
    city,
    found: totalFound,
    saved: totalSaved,
    emails: totalEmails,
    searchesUsed,
    debug: debugMessages.length > 0 ? debugMessages : undefined,
  });
}
