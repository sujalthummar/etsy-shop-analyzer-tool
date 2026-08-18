# Etsy Listing Monitor

Track any Etsy shop and see exactly what changed on each listing — title,
description, price, quantity, tags — with a before → after view, across
shops with hundreds of listings. No more opening every product by hand.

## How it works

1. You give it a shop (name or URL). It looks up the shop on Etsy's official API.
2. Click **Sync now** — it pulls every active listing and saves a snapshot.
3. Click **Sync now** again later (tomorrow, next week, whenever) — it pulls
   the listings again, compares each one field-by-field against its last
   snapshot, and logs anything that changed.
4. The dashboard shows the change log; **Export CSV** downloads it (opens
   fine in Excel/Google Sheets).

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
   creates the `shops`, `listing_snapshots`, and `listing_changes` tables.
3. In **Project Settings → API**, copy the **Project URL** and the
   **service_role** key (not the anon key — this app needs to bypass RLS
   from the server; the service_role key is never exposed to the browser).

## 3. Configure and run

```bash
cp .env.example .env.local
# fill in ETSY_KEYSTRING, ETSY_SHARED_SECRET, NEXT_PUBLIC_SUPABASE_URL,
# SUPABASE_SERVICE_ROLE_KEY

npm install
npm run dev
```

Open <http://localhost:3000>, add a shop, click **Sync now**.

## 4. Deploy (optional)

Push this to a GitHub repo and import it into Vercel, adding the same
env vars there. Any host that runs Next.js works.

## 5. Automatic syncing (optional)

Right now syncing happens when you click the button. If you'd rather it
run on its own on a schedule, `app/api/cron/route.ts` is ready for it —
just hit `GET /api/cron?secret=<CRON_SECRET>` from a scheduler (Vercel
Cron, cron-job.org, GitHub Actions, etc.) and it'll sync every tracked
shop in one call. Not wired up by default since you didn't ask for
alerts — this just makes the existing sync run unattended if you want it.

## Notes on limits

- Etsy's API allows ~10 requests/second. For a 100–200 listing shop
  that's 1–2 paginated calls, so you're nowhere near the limit even
  syncing several shops back to back.
- Etsy doesn't provide a native "what changed" history — that's exactly
  what the snapshot + diff approach here is for.
