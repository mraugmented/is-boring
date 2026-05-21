# is-boring Client Playbook

## The System

This is the repeatable process for acquiring, building, deploying, and onboarding clients.

---

## Phase 1: Build the Site

### 1. Create the project

```bash
cd /Users/justyneddins
npx create-next-app@latest [client-name] --typescript --tailwind --eslint --app --src-dir --no-import-alias --turbopack
cd [client-name]
npm install framer-motion
```

### 2. Build the site
- Research the client (existing site, social media, photos, services)
- Collect assets: logo, photos, brand colors
- Copy photos to `public/` directory
- Build a single-page site with sections: Hero, Portfolio/Work, Services, About, Contact
- Match the client's brand (colors, tone, industry vibe)

### 3. Wire the contact form
Every client site's contact form must POST to the is-boring leads API:

```typescript
const res = await fetch('https://is-boring.com/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    site_id: '[client-name]',  // matches the project name
    name: formData.name,
    email: formData.email,
    phone: formData.phone || undefined,
    business_name: formData.business || undefined,
    message: formData.message,
  }),
});
```

### 4. Add analytics tracking
Add this script tag to the client site's `layout.tsx` or `page.tsx`:

```html
<script src="https://is-boring.com/track.js" data-site-id="[client-name]"></script>
```

Or embed the tracking inline for Next.js:
```tsx
<Script src="https://is-boring.com/track.js" data-site-id="[client-name]" strategy="afterInteractive" />
```

### 5. Test locally
```bash
npm run build
npm run dev
```
- Verify all sections render
- Test contact form submission
- Check mobile responsiveness

---

## Phase 2: Deploy to Vercel

### 1. Push to GitHub
```bash
git init && git branch -m main
git add -A && git commit -m "Initial commit: [Client Name] website"
gh repo create [client-name] --public --source=. --push
gh repo edit mraugmented/[client-name] --default-branch main
```

### 2. Deploy to Vercel
```bash
npx vercel --prod --yes --scope justyn-s-projects
```

### 3. Configure Vercel project (dashboard)
- **Settings → General** → Framework Preset: **Next.js**
- **Settings → Deployment Protection** → Turn OFF "Require Log In"

### 4. Verify deployment
```bash
curl -s -o /dev/null -w "%{http_code}" https://[project-name].vercel.app/
# Should return 200
```

---

## Phase 3: Send Outreach

### 1. Create prospect in admin
Go to `is-boring.com/admin/outreach` OR use the API:

The outreach form creates the prospect in the DB and sends a branded email with:
- Site preview screenshot (auto-generated)
- "View Your New Site" button
- Soft CTA: "Just reply to this email and we'll go from there"

### 2. What gets sent
- From: justyn@is-boring.com
- Subject: "I built something for [Company Name]"
- Preview URL embedded as clickable screenshot
- No portal mention (that comes after conversion)

### 3. Track outreach
The prospect appears in:
- Admin Dashboard → Pipeline (Outreach Sent stage)
- Admin → Clients → click to see detail
- Admin → Outreach → Prospect Pipeline

---

## Phase 4: Close the Deal

### 1. Update pipeline stage
As the prospect responds:
- **Replied** → they responded to the email
- **Meeting Booked** → call/meeting scheduled
- **Closed Won** → they said yes!
- **Closed Lost** → they passed (add lost_reason)

Update via: Admin → Clients → [Client] → Edit → Status dropdown
Or: Admin → Pipeline → drag/dropdown on the card

### 2. Set pricing
In client detail → Edit:
- Monthly Rate: $150 (or custom)
- Plan: Starter / Growth / Enterprise
- Payment Status: Trial → Paid

---

## Phase 5: Connect Domain

### 1. Add domain to Vercel
```bash
cd /Users/justyneddins/[client-name]
npx vercel domains add [domain.com] --scope justyn-s-projects
npx vercel domains add www.[domain.com] --scope justyn-s-projects
```

### 2. Configure DNS (Squarespace or other registrar)
Add Custom Records:

| Type | Name | Data |
|---|---|---|
| A | @ | 76.76.21.21 (or whatever Vercel shows) |
| CNAME | www | cname.vercel-dns.com |

If domain is linked to an existing site (Squarespace, Wix, etc.), **disconnect the site first** before DNS changes will take effect.

### 3. Verify
```bash
dig [domain.com] A +short
# Should show Vercel IP
curl -s -o /dev/null -w "%{http_code}" https://[domain.com]/
# Should return 200
```

---

## Phase 6: Onboard Client

### 1. Convert prospect to client
Admin → Clients → [Client] → **"Convert to Client"** button

This automatically:
- Creates their Supabase auth account
- Generates a temp password
- Sets status to "active"
- Sends portal invite email with login credentials

### 2. Add their site to the client record
Admin → Clients → [Client] → **"Add Site"**
- Site Name: [Client] Website
- Domain: [domain.com]
- Vercel Project ID: (from .vercel/project.json)
- Tech Stack: Next.js, Tailwind, Vercel
- Status: Live

### 3. What the client sees
1. Invite email with email + temp password
2. Logs in at is-boring.com/portal/login
3. Welcome screen with feature overview
4. Agreement banner → signs service agreement
5. Dashboard: sites, requests, messages, leads, analytics
6. Can submit up to 5 change requests/month

---

## Phase 7: Ongoing Management

### Client actions (portal):
- View their site status
- Submit change requests (5/month)
- Upload files (photos, logos, docs)
- View their leads from site contact form
- View site analytics
- Message the is-boring team
- View plan details and usage

### Admin actions:
- Monitor all clients in dashboard
- Triage requests (pending → in progress → completed)
- Reply to messages
- View client leads and analytics
- Track revenue and pipeline
- Deploy site updates via git push

---

## Checklist: New Client Setup

```
[ ] Research client (industry, brand, services, photos)
[ ] Build Next.js site with contact form + analytics
[ ] Contact form POSTs to is-boring.com/api/leads with site_id
[ ] Analytics script added with data-site-id
[ ] Push to GitHub (mraugmented/[name])
[ ] Deploy to Vercel (framework: Next.js, auth: off)
[ ] Verify site loads (200)
[ ] Send outreach via admin/outreach
[ ] Track in pipeline
[ ] Close deal → set pricing
[ ] Connect domain (Vercel + DNS)
[ ] Convert to client (sends login credentials)
[ ] Add site to client record in admin
[ ] Verify client can log into portal
[ ] Verify leads flow from contact form → portal
```

---

## Architecture

```
is-boring.com (platform)
├── / — Landing page
├── /portal — Client portal (auth required)
│   ├── Dashboard, Sites, Leads, Requests, Messages
│   ├── Files, Analytics, Plan, Agreement, Settings
│   └── Login, Forgot Password, Reset Password
├── /admin — Admin panel (admin role required)
│   ├── Dashboard, Pipeline, Clients, Sites
│   ├── Requests, Messages, Contacts, Outreach
│   └── Client detail (sites, leads, files, analytics, messages)
├── /api/leads — Public lead capture (client sites POST here)
├── /api/track — Public analytics tracking
├── /api/portal/* — Authenticated portal APIs
├── /api/admin/* — Admin APIs (outreach, convert-prospect)
└── /track.js — Embeddable analytics script

Client sites (separate repos, deployed to Vercel)
├── Contact form → POST to is-boring.com/api/leads
├── Analytics → is-boring.com/track.js
└── Managed under is-boring Vercel team
```

## Database (Supabase)

```
profiles — Auth-linked user profiles (admin/client roles)
clients — All clients with pipeline stage, pricing, agreement
client_sites — Sites per client (domain, Vercel project, status)
requests — Change requests from clients (5/month limit)
messages — Client ↔ admin messaging
site_leads — Contact form submissions from client sites
client_files — File uploads from clients
client_analytics — Page view tracking from client sites
site_analytics — Cached analytics summaries
service_agreements — Signed contracts
activity_log — All platform events
contacts — is-boring.com landing page form submissions
```
