import { NextRequest } from 'next/server';
import { createSupabaseServerClient, getUser } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  // Get client for this user
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!client) {
    return Response.json({ error: 'Client not found' }, { status: 404 });
  }

  const url = request.nextUrl;
  const siteId = url.searchParams.get('site_id');
  const period = url.searchParams.get('period') === '30d' ? 30 : 7;

  if (!siteId) {
    return Response.json({ error: 'site_id is required' }, { status: 400 });
  }

  // Verify this site belongs to the client
  const { data: site } = await supabase
    .from('client_sites')
    .select('id')
    .eq('id', siteId)
    .eq('client_id', client.id)
    .single();

  if (!site) {
    return Response.json({ error: 'Site not found' }, { status: 404 });
  }

  const since = new Date();
  since.setDate(since.getDate() - period);
  const sinceISO = since.toISOString();

  // Fetch all analytics for this site in the period
  const { data: events, error } = await supabase
    .from('client_analytics')
    .select('*')
    .eq('site_id', siteId)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = events ?? [];

  // Total views
  const pageViews = rows.filter((r) => r.event_type === 'page_view');
  const totalViews = pageViews.length;

  // Unique visitors (distinct session_ids)
  const sessionIds = new Set(rows.map((r) => r.session_id));
  const uniqueVisitors = sessionIds.size;

  // Views by day
  const dayMap = new Map<string, { views: number; visitors: Set<string> }>();
  for (let i = 0; i < period; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (period - 1 - i));
    const key = d.toISOString().split('T')[0];
    dayMap.set(key, { views: 0, visitors: new Set() });
  }
  for (const pv of pageViews) {
    const day = pv.created_at.split('T')[0];
    const entry = dayMap.get(day);
    if (entry) {
      entry.views++;
      entry.visitors.add(pv.session_id);
    }
  }
  const viewsByDay = Array.from(dayMap.entries()).map(([date, val]) => ({
    date,
    views: val.views,
    visitors: val.visitors.size,
  }));

  // Top pages
  const pageCounts = new Map<string, number>();
  for (const pv of pageViews) {
    const path = pv.event_data?.path || '/';
    pageCounts.set(path, (pageCounts.get(path) || 0) + 1);
  }
  const topPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  // Avg session duration
  const sessionStarts = new Map<string, string>();
  const sessionEnds = new Map<string, string>();
  for (const r of rows) {
    if (r.event_type === 'session_start') sessionStarts.set(r.session_id, r.created_at);
    if (r.event_type === 'session_end') sessionEnds.set(r.session_id, r.created_at);
  }
  let totalDuration = 0;
  let sessionCount = 0;
  for (const [sid, start] of sessionStarts) {
    const end = sessionEnds.get(sid);
    if (end) {
      const dur = new Date(end).getTime() - new Date(start).getTime();
      if (dur > 0 && dur < 3600000) {
        totalDuration += dur;
        sessionCount++;
      }
    }
  }
  const avgSessionDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount / 1000) : 0;

  return Response.json({
    total_views: totalViews,
    unique_visitors: uniqueVisitors,
    views_by_day: viewsByDay,
    top_pages: topPages,
    avg_session_duration: avgSessionDuration,
  });
}
