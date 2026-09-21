# Etsy Listing Monitor

Track any Etsy shop and see exactly what changed on each listing — title,
description, price, quantity, tags, new listings, removed listings — with
a before → after view, across shops with hundreds of listings. No more
opening every product by hand.

## How it works

1. You give it a shop (name or URL). It looks up the shop on Etsy's official API.
2. Click **Sync now** (or let it auto-sync — see below) — it pulls every
   active listing and saves a snapshot.
3. The next sync compares each listing field-by-field against its last
   snapshot and logs anything that changed: title, description, price,
   quantity, tags, a listing being added, or a listing disappearing
   (deleted, sold out, expired).
4. The dashboard shows the change log — grouped by shop, and by product
   within each shop so you can see one listing's full history in order.
   **Export CSV** downloads it (opens fine in Excel/Google Sheets).

The first sync for a shop only sets the baseline — there's nothing to
compare yet, so no changes will show up until the second sync.

## 1. Get Etsy API credentials

1. Go to <https://www.etsy.com/developers/register> and register an app
   (pick **Seller App** if you're only monitoring your own shop(s);
   **Personal App** otherwise).
2. Once approved, go to **Your Apps** and copy your **Keystring** and
   **Shared Secret**.
3. Important: as of Feb 2026, Etsy requires *both* values on every
   request (`keystring:sharedsecret`) — this code already handles that,
   just make sure you copy both, not only the keystring.

No OAuth flow is needed for this tool — it only reads public listing
data (`findShops` and `findAllActiveListingsByShop`), which works with
just the API key.

## 2. Set up Supabase

1. Create a free project at <https://supabase.com>.
2. In the SQL editor, run everything in `supabase/schema.sql` — this
   creates the `shops`, `listing_snapshots`, `listing_changes`, and
   `sync_schedules` tables.
3. In **Project Settings → API Keys**, copy the **Project URL** and the
   **Secret key** (`sb_secret_...` — the new name for what used to be
   called the service_role key. Not the Publishable key — this app needs
   to bypass RLS from the server, and the secret key is never exposed to
   the browser).

## 3. Configure and run

```bash
cp .env.example .env.local
# fill in ETSY_KEYSTRING, ETSY_SHARED_SECRET, NEXT_PUBLIC_SUPABASE_URL,
# SUPABASE_SERVICE_ROLE_KEY (paste the sb_secret_... value here)

npm install
npm run dev
```

Open <http://localhost:3000>, add a shop, click **Sync now**.

## 4. Deploy (optional)

Push this to a GitHub repo and import it into Vercel, adding the same
env vars there. Any host that runs Next.js works.

## 5. Auto-sync on a schedule (optional)

Each shop's row on the dashboard has a **"▸ Auto-sync"** toggle. Click it
to expand a panel where you can add any number of sync times, each with
its own timezone (e.g. 9:00 AM Asia/Kolkata AND 6:00 PM Europe/London
for the same shop) — every entry runs once a day, independently.

**Important — this needs an external trigger to actually fire.** The app
runs on serverless hosting (Vercel etc.), which means it can't "wake
itself up" on its own. Something has to periodically call the app and
ask "is anything due yet?" — that something is `GET
/api/cron?secret=<CRON_SECRET>`, which checks every saved schedule
against the current time in its timezone and syncs whichever shops are
due.

The easiest free way to trigger it:

1. Create a free account at <https://cron-job.org>.
2. Add a job that calls `https://<your-app>.vercel.app/api/cron?secret=<CRON_SECRET>`
   every **15 minutes**.
3. Done — from then on, any schedule you add in the dashboard will fire
   automatically (within ~15 min of the time you set) without you
   needing to be online or click anything.

(Vercel's own built-in Cron only runs once a day on the free Hobby plan,
which isn't fine-grained enough to honor several different per-shop
times — an external poller like cron-job.org is the practical option and
costs nothing.)

## Notes on limits

- Etsy's API rate limit is 5 requests/second, 5,000/day on a personal
  app. For a 100–200 listing shop that's 1–2 paginated calls, so you're
  nowhere near the limit even syncing several shops back to back.
- Etsy doesn't provide a native "what changed" history, or any API
  access to Etsy Ads/Promoted Listings data (impressions, clicks, spend)
  — that's outside what Etsy exposes to any app, not a limitation of
  this tool.
