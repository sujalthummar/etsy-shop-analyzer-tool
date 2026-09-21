import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { syncShop } from "@/lib/sync";
import { getLocalTimeParts } from "@/lib/timezone";

/**
 * Call this on a schedule (every 5-30 min, from an external poller like
 * cron-job.org — see README) to run each shop's own auto-sync times.
 *
 * A shop can have several sync_schedules rows, each with its own time AND
 * its own timezone. For every row, this checks "what's the local date/time
 * right now in that specific timezone" and fires the shop's sync once that
 * row's time has passed for its local day — then marks that row done for
 * the day so it doesn't refire on the next poll.
 *
 * Protected by CRON_SECRET so randoms on the internet can't trigger it.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  const [{ data: schedules, error: schedErr }, { data: shops, error: shopErr }] = await Promise.all([
    supabase.from("sync_schedules").select("id, shop_id, timezone, hour, minute, enabled, last_synced_date"),
    supabase.from("shops").select("id, etsy_shop_id, shop_name"),
  ]);
  if (schedErr) return NextResponse.json({ error: schedErr.message }, { status: 500 });
  if (shopErr) return NextResponse.json({ error: shopErr.message }, { status: 500 });

  const shopById = new Map((shops ?? []).map((s) => [s.id, s]));

  const due = (schedules ?? []).filter((s) => {
    if (!s.enabled || !shopById.has(s.shop_id)) return false;
    const { hour, minute, dateStr } = getLocalTimeParts(s.timezone);
    if (s.last_synced_date === dateStr) return false; // already ran today, in that timezone
    return hour * 60 + minute >= s.hour * 60 + s.minute;
  });

  const results = [];
  for (const s of due) {
    const shop = shopById.get(s.shop_id)!;
    const { dateStr } = getLocalTimeParts(s.timezone);
    try {
      const result = await syncShop(shop.id as string, shop.etsy_shop_id as number);
      await supabase.from("sync_schedules").update({ last_synced_date: dateStr }).eq("id", s.id);
      results.push({
        shop: shop.shop_name,
        scheduledFor: `${s.hour}:${String(s.minute).padStart(2, "0")} ${s.timezone}`,
        ...result,
      });
    } catch (err: any) {
      results.push({ shop: shop.shop_name, error: err.message });
    }
  }

  return NextResponse.json({ checked: schedules?.length ?? 0, synced: results.length, results });
}
