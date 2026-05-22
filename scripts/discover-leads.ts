/**
 * Lead Discovery Agent v2
 *
 * Finds LA service businesses with no website or outdated websites.
 * Extracts emails from websites when possible.
 * Saves scored leads to Supabase prospect_leads table.
 *
 * Usage:
 *   npx tsx scripts/discover-leads.ts                                    # all categories, default cities
 *   npx tsx scripts/discover-leads.ts --category "barber shop"           # single category, default cities
 *   npx tsx scripts/discover-leads.ts --city "Torrance CA"               # all categories, single city
 *   npx tsx scripts/discover-leads.ts --category "nail salon" --city "Torrance CA"
 *   npx tsx scripts/discover-leads.ts --batch                            # run ALL categories x ALL cities
 *   npx tsx scripts/discover-leads.ts --batch --max-searches 20          # limit API usage
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const CATEGORIES = [
  'barber shop',
  'nail salon',
  'beauty salon',
  'hair salon',
  'plumber',
  'electrician',
  'personal trainer',
  'small gym',
  'auto body shop',
  'landscaping',
  'cleaning service',
  'tattoo shop',
  'pet grooming',
  'handyman',
  'moving company',
  'massage therapist',
  'yoga studio',
  'dog walker',
  'carpet cleaning',
  'pressure washing',
];

const CITIES = [
  'Torrance CA',
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
  'Highland Park Los Angeles CA',
  'Eagle Rock Los Angeles CA',
  'Woodland Hills CA',
  'Tarzana CA',
  'Canoga Park CA',
  'Reseda CA',
  'Panorama City CA',
  'Sun Valley CA',
  'Arleta CA',
  'Pacoima CA',
  'Sylmar CA',
  'Chatsworth CA',
  'Northridge CA',
  'Granada Hills CA',
  'Porter Ranch CA',
  'Redondo Beach CA',
  'Hermosa Beach CA',
  'Manhattan Beach CA',
  'Hawthorne CA',
  'Lawndale CA',
  'Gardena CA',
  'Carson CA',
  'Lomita CA',
  'San Pedro CA',
  'Wilmington CA',
  'Long Beach CA',
  'Lakewood CA',
];

interface Business {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category: string;
}

let searchCount = 0;

// ============================================
// SerpAPI — Google Maps search
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
    if (!res.ok) {
      console.error(`  SerpAPI ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    searchCount++;
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
// Extract email from a website
// ============================================
async function scrapeEmail(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(fullUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; is-boring-bot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();

    // Extract emails with regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = html.match(emailRegex) || [];

    // Filter out common junk emails
    const junk = ['example.com', 'wixpress', 'sentry.io', 'squarespace', 'wordpress', 'w3.org', 'schema.org', 'googleapis', 'google.com', 'facebook.com', 'twitter.com'];
    const validEmails = emails.filter(e => !junk.some(j => e.includes(j)));

    // Prefer emails that look like business emails (info@, contact@, sales@, hello@)
    const preferred = validEmails.find(e =>
      e.startsWith('info@') || e.startsWith('contact@') || e.startsWith('sales@') ||
      e.startsWith('hello@') || e.startsWith('admin@') || e.startsWith('office@')
    );

    return preferred || validEmails[0] || null;
  } catch {
    return null;
  }
}

// ============================================
// Website quality checker
// ============================================
async function checkWebsite(url: string): Promise<{ exists: boolean; score: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

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

    const isModern = html.includes('__next') || html.includes('__nuxt') ||
                     html.includes('react') || html.includes('vue-app');
    if (!isModern) score -= 1;

    if (html.includes('<table') && html.includes('bgcolor')) score -= 3;
    if (html.includes('Flash') || html.includes('.swf')) score -= 4;
    if (html.includes('wix.com') || html.includes('squarespace')) score -= 1;
    if (html.length < 2000) score -= 3;

    return { exists: true, score: Math.max(0, score) };
  } catch {
    return { exists: false, score: 0 };
  }
}

// ============================================
// Score a lead
// ============================================
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
  if (biz.email) score += 2; // Bonus for having email

  return score;
}

// ============================================
// Main discovery
// ============================================
async function discover(opts: {
  categories: string[];
  cities: string[];
  maxSearches?: number;
}) {
  const { categories, cities, maxSearches } = opts;
  let totalFound = 0;
  let totalSaved = 0;
  let totalEmails = 0;

  for (const category of categories) {
    for (const city of cities) {
      if (maxSearches && searchCount >= maxSearches) {
        console.log(`\n⚠️  Hit max searches limit (${maxSearches}). Stopping.`);
        printSummary(totalFound, totalSaved, totalEmails);
        return;
      }

      const query = `${category} in ${city}`;
      console.log(`\n🔍 [${searchCount + 1}${maxSearches ? `/${maxSearches}` : ''}] ${query}`);

      const businesses = await searchSerpAPI(query);
      if (businesses.length === 0) {
        console.log('  No results');
        continue;
      }

      console.log(`  Found ${businesses.length} businesses`);
      totalFound += businesses.length;

      for (const biz of businesses) {
        // Check website + try to get email
        let websiteCheck = { exists: false, score: 0 };
        let email: string | null = null;

        if (biz.website) {
          const url = biz.website.startsWith('http') ? biz.website : `https://${biz.website}`;
          [websiteCheck, email] = await Promise.all([
            checkWebsite(url),
            scrapeEmail(url),
          ]);
          if (email) {
            biz.email = email;
            totalEmails++;
          }
        }

        const leadScore = scoreLead(biz, websiteCheck);

        if (leadScore < 5) {
          continue; // Skip low-quality leads silently
        }

        const { error } = await supabase.from('prospect_leads').upsert(
          {
            business_name: biz.name,
            category,
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

        if (!error) {
          totalSaved++;
          const icon = !websiteCheck.exists ? '🟢' : leadScore >= 7 ? '🟡' : '⚪';
          const emailTag = biz.email ? ` 📧 ${biz.email}` : '';
          console.log(`  ${icon} ${biz.name} — score ${leadScore}${!websiteCheck.exists ? ' (NO WEBSITE!)' : ` (site: ${websiteCheck.score}/10)`}${emailTag}`);
        }
      }

      // Rate limit between searches
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  printSummary(totalFound, totalSaved, totalEmails);
}

function printSummary(found: number, saved: number, emails: number) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Discovery complete!`);
  console.log(`   Searches used: ${searchCount}`);
  console.log(`   Businesses found: ${found}`);
  console.log(`   Qualified leads saved: ${saved}`);
  console.log(`   Emails extracted: ${emails}`);
  console.log(`${'='.repeat(50)}`);
}

// ============================================
// CLI
// ============================================
const args = process.argv.slice(2);
let category: string | undefined;
let city: string | undefined;
let batch = false;
let maxSearches: number | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--category' && args[i + 1]) category = args[i + 1];
  if (args[i] === '--city' && args[i + 1]) city = args[i + 1];
  if (args[i] === '--batch') batch = true;
  if (args[i] === '--max-searches' && args[i + 1]) maxSearches = parseInt(args[i + 1]);
}

const categories = category ? [category] : batch ? CATEGORIES : CATEGORIES.slice(0, 5);
const cities = city ? [city] : batch ? CITIES.slice(0, 5) : CITIES.slice(0, 3);

console.log(`\n🚀 is-boring Lead Discovery Agent v2`);
console.log(`   Categories: ${categories.length} (${categories.slice(0, 3).join(', ')}${categories.length > 3 ? '...' : ''})`);
console.log(`   Cities: ${cities.length} (${cities.slice(0, 3).join(', ')}${cities.length > 3 ? '...' : ''})`);
console.log(`   Max searches: ${maxSearches || 'unlimited'}`);
console.log(`   Estimated API calls: ${categories.length * cities.length}\n`);

discover({ categories, cities, maxSearches });
