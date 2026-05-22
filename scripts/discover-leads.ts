/**
 * Lead Discovery Agent
 *
 * Scrapes Google Maps via SerpAPI (free tier: 100 searches/month)
 * or falls back to direct search scraping.
 *
 * Finds LA service businesses with no website or outdated websites.
 * Saves scored leads to Supabase prospect_leads table.
 *
 * Usage:
 *   npx tsx scripts/discover-leads.ts
 *   npx tsx scripts/discover-leads.ts --category "barber shop"
 *   npx tsx scripts/discover-leads.ts --category "nail salon" --area "North Hollywood"
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Target categories for is-boring clients
const CATEGORIES = [
  'barber shop',
  'nail salon',
  'beauty salon',
  'hair salon',
  'plumber',
  'electrician',
  'personal trainer gym',
  'small gym fitness',
  'auto body shop',
  'landscaping company',
  'cleaning service',
  'tattoo shop',
  'pet grooming',
  'handyman service',
  'moving company',
];

const LA_AREAS = [
  'Los Angeles CA',
  'North Hollywood CA',
  'Studio City CA',
  'Sherman Oaks CA',
  'Encino CA',
  'Van Nuys CA',
  'Burbank CA',
  'Glendale CA',
  'Pasadena CA',
  'Culver City CA',
  'Santa Monica CA',
  'West Hollywood CA',
  'Silver Lake Los Angeles CA',
  'Echo Park Los Angeles CA',
  'Highland Park Los Angeles CA',
];

interface Business {
  name: string;
  phone?: string;
  address?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category: string;
}

// ============================================
// SerpAPI approach (recommended, 100 free/month)
// Get key at: https://serpapi.com
// ============================================
async function searchSerpAPI(query: string): Promise<Business[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    engine: 'google_maps',
    q: query,
    type: 'search',
    api_key: apiKey,
  });

  try {
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return [];

    const data = await res.json();
    const results = data.local_results || [];

    return results.map((r: Record<string, unknown>) => ({
      name: r.title as string,
      phone: r.phone as string | undefined,
      address: r.address as string | undefined,
      website: r.website as string | undefined,
      rating: r.rating as number | undefined,
      reviews: r.reviews as number | undefined,
      category: query.split(' in ')[0],
    }));
  } catch (err) {
    console.error(`SerpAPI error for "${query}":`, err);
    return [];
  }
}

// ============================================
// Free fallback: Google Custom Search API
// (100 queries/day free with API key)
// ============================================
async function searchGoogle(query: string): Promise<Business[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  if (!apiKey || !cx) return [];

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: '10',
  });

  try {
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
    if (!res.ok) return [];

    const data = await res.json();
    const items = data.items || [];

    return items
      .filter((item: Record<string, unknown>) => {
        const link = item.link as string;
        // Filter out directory listings, keep actual business pages
        return !link.includes('yelp.com') && !link.includes('yellowpages') && !link.includes('facebook.com');
      })
      .map((item: Record<string, unknown>) => ({
        name: (item.title as string).split(' - ')[0].split(' | ')[0].trim(),
        website: item.link as string,
        address: undefined,
        phone: undefined,
        category: query.split(' in ')[0],
      }));
  } catch (err) {
    console.error(`Google Search error for "${query}":`, err);
    return [];
  }
}

// ============================================
// Free: Scrape from public directories
// ============================================
async function searchYelpFree(category: string, location: string): Promise<Business[]> {
  const query = encodeURIComponent(`${category} ${location}`);
  try {
    const res = await fetch(`https://www.yelp.com/search?find_desc=${encodeURIComponent(category)}&find_loc=${encodeURIComponent(location)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) return [];
    const html = await res.text();

    // Extract business names and phones from Yelp HTML
    const businesses: Business[] = [];

    // Simple regex extraction for business names from Yelp
    const nameMatches = html.matchAll(/class="css-19v1rkv"[^>]*>([^<]+)<\/a>/g);
    for (const match of nameMatches) {
      if (match[1] && !match[1].includes('Yelp') && match[1].length > 2) {
        businesses.push({
          name: match[1].trim(),
          category,
        });
      }
    }

    // Alternative pattern
    if (businesses.length === 0) {
      const altMatches = html.matchAll(/"name":"([^"]+)","phone":"([^"]*)","addressLines":\["([^"]*)"/g);
      for (const match of altMatches) {
        businesses.push({
          name: match[1],
          phone: match[2] || undefined,
          address: match[3] || undefined,
          category,
        });
      }
    }

    return businesses.slice(0, 20);
  } catch (err) {
    console.error(`Yelp scrape error:`, err);
    return [];
  }
}

// ============================================
// Website quality checker
// ============================================
async function checkWebsite(url: string): Promise<{ exists: boolean; score: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; is-boring-bot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return { exists: false, score: 0 };

    const html = await res.text();
    let score = 10; // Start at 10, deduct for issues

    // Check for mobile viewport
    if (!html.includes('viewport')) score -= 3;

    // Check for HTTPS
    if (!url.startsWith('https')) score -= 2;

    // Check for modern frameworks (React, Next, Vue, etc.)
    const isModern = html.includes('__next') || html.includes('__nuxt') ||
                     html.includes('react') || html.includes('vue-app');
    if (!isModern) score -= 1;

    // Check for very old patterns
    if (html.includes('<table') && html.includes('bgcolor')) score -= 3;
    if (html.includes('Flash') || html.includes('.swf')) score -= 4;

    // Check for Wix/Squarespace/basic builders
    if (html.includes('wix.com') || html.includes('squarespace')) score -= 1;

    // Check for very short pages (likely parked/placeholder)
    if (html.length < 2000) score -= 3;

    return { exists: true, score: Math.max(0, score) };
  } catch {
    return { exists: false, score: 0 };
  }
}

// ============================================
// Score a lead (higher = better prospect)
// ============================================
function scoreLead(biz: Business, websiteCheck: { exists: boolean; score: number }): number {
  let score = 0;

  // No website = highest value
  if (!biz.website || !websiteCheck.exists) {
    score += 10;
  } else {
    // Bad website = good prospect
    score += Math.max(0, 7 - websiteCheck.score);
  }

  // Has reviews = established business
  if (biz.reviews && biz.reviews > 10) score += 2;
  if (biz.reviews && biz.reviews > 50) score += 1;

  // Good rating = reputable
  if (biz.rating && biz.rating >= 4.0) score += 1;

  // Has phone = contactable
  if (biz.phone) score += 1;

  return score;
}

// ============================================
// Main discovery loop
// ============================================
async function discover(targetCategory?: string, targetArea?: string) {
  const categories = targetCategory ? [targetCategory] : CATEGORIES;
  const areas = targetArea ? [targetArea] : LA_AREAS.slice(0, 3); // Start with 3 areas

  let totalFound = 0;
  let totalSaved = 0;

  for (const category of categories) {
    for (const area of areas) {
      const query = `${category} in ${area}`;
      console.log(`\n🔍 Searching: ${query}`);

      // Try SerpAPI first, then Yelp, then Google
      let businesses: Business[] = [];

      businesses = await searchSerpAPI(query);
      if (businesses.length === 0) {
        console.log('  SerpAPI unavailable, trying Yelp...');
        businesses = await searchYelpFree(category, area);
      }
      if (businesses.length === 0) {
        console.log('  Yelp unavailable, trying Google Search...');
        businesses = await searchGoogle(`${category} ${area} phone email`);
      }

      console.log(`  Found ${businesses.length} businesses`);
      totalFound += businesses.length;

      for (const biz of businesses) {
        // Check website quality
        let websiteCheck = { exists: false, score: 0 };
        if (biz.website) {
          const url = biz.website.startsWith('http') ? biz.website : `https://${biz.website}`;
          websiteCheck = await checkWebsite(url);
        }

        const leadScore = scoreLead(biz, websiteCheck);

        // Only save leads with score >= 5 (worth pursuing)
        if (leadScore < 5) {
          console.log(`  ⏭  ${biz.name} — score ${leadScore} (too low, skipping)`);
          continue;
        }

        // Upsert to avoid duplicates
        const { error } = await supabase.from('prospect_leads').upsert(
          {
            business_name: biz.name,
            category,
            phone: biz.phone || null,
            email: null, // Would need to scrape from website
            address: biz.address || null,
            city: area,
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

        if (!error) {
          totalSaved++;
          const icon = websiteCheck.exists ? '🟡' : '🟢';
          console.log(`  ${icon} ${biz.name} — score ${leadScore} ${!websiteCheck.exists ? '(NO WEBSITE!)' : `(site score: ${websiteCheck.score}/10)`}`);
        }
      }

      // Rate limit between searches
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n✅ Done! Found ${totalFound} businesses, saved ${totalSaved} qualified leads.`);
}

// ============================================
// CLI entry
// ============================================
const args = process.argv.slice(2);
let category: string | undefined;
let area: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--category' && args[i + 1]) category = args[i + 1];
  if (args[i] === '--area' && args[i + 1]) area = args[i + 1];
}

discover(category, area);
