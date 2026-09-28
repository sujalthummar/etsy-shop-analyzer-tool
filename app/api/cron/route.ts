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
  const debug = req.nextUrl.searchParams.get("debug") === "true";

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  const [
    { data: schedules, error: schedErr },
    { data: shops, error: shopErr },
  ] = await Promise.all([
    supabase
      .from("sync_schedules")
      .select("id, shop_id, timezone, hour, minute, enabled, last_synced_date"),
    supabase.from("shops").select("id, etsy_shop_id, shop_name"),
  ]);
  if (schedErr)
    return NextResponse.json({ error: schedErr.message }, { status: 500 });
  if (shopErr)
    return NextResponse.json({ error: shopErr.message }, { status: 500 });

  const shopById = new Map((shops ?? []).map((s) => [s.id, s]));

  // Debug mode - show detailed info
  if (debug) {
    const scheduleDetails = (schedules ?? []).map((s) => {
      const shop = shopById.get(s.shop_id);
      const { hour, minute, dateStr } = getLocalTimeParts(s.timezone);
      const currentMinutes = hour * 60 + minute;
      const scheduleMinutes = s.hour * 60 + s.minute;
      const isDue = currentMinutes >= scheduleMinutes;
      const alreadySyncedToday = s.last_synced_date === dateStr;

      return {
        scheduleId: s.id,
        shopName: shop?.shop_name ?? "Unknown",
        etsyShopId: shop?.etsy_shop_id ?? null,
        timezone: s.timezone,
        scheduledTime: `${s.hour}:${String(s.minute).padStart(2, "0")}`,
        currentLocalTime: `${hour}:${String(minute).padStart(2, "0")}`,
        currentDate: dateStr,
        lastSyncedDate: s.last_synced_date,
        enabled: s.enabled,
        isDue,
        alreadySyncedToday,
        willSync:
          s.enabled && isDue && !alreadySyncedToday && shop !== undefined,
      };
    });

    return NextResponse.json({
      message: "Cron Debug Mode",
      database: {
        totalShops: shops?.length ?? 0,
        totalSchedules: schedules?.length ?? 0,
        shops: shops?.map((s) => ({
          id: s.id,
          shopName: s.shop_name,
          etsyShopId: s.etsy_shop_id,
        })),
      },
      schedules: scheduleDetails,
      summary: {
        enabledSchedules: scheduleDetails.filter((s) => s.enabled).length,
        dueSchedules: scheduleDetails.filter((s) => s.isDue).length,
        willSyncNow: scheduleDetails.filter((s) => s.willSync).length,
      },
    });
  }

  const due = (schedules ?? []).filter((s) => {
    if (!s.enabled || !shopById.has(s.shop_id)) return false;
    const { hour, minute, dateStr } = getLocalTimeParts(s.timezone);
    if (s.last_synced_date === dateStr) return false; // already ran today, in that timezone
    return hour * 60 + minute >= s.hour * 60 + s.minute;
  });

  // Limit to 3 shops per cron run to avoid timeout on Vercel Free plan (10s limit)
  // Remaining shops will sync on the next cron run (within 15 min)
  const batchSize = 3;
  const batch = due.slice(0, batchSize);

  // Process batch in parallel for better performance
  const results = await Promise.allSettled(
    batch.map(async (s) => {
      const shop = shopById.get(s.shop_id)!;
      const { dateStr } = getLocalTimeParts(s.timezone);
      try {
        const result = await syncShop(
          shop.id as string,
          shop.etsy_shop_id as number,
        );
        await supabase
          .from("sync_schedules")
          .update({ last_synced_date: dateStr })
          .eq("id", s.id);
        return {
          shop: shop.shop_name,
          scheduledFor: `${s.hour}:${String(s.minute).padStart(2, "0")} ${s.timezone}`,
          ...result,
        };
      } catch (err: any) {
        return { shop: shop.shop_name, error: err.message };
      }
    }),
  );

  return NextResponse.json({
    checked: schedules?.length ?? 0,
    due: due.length,
    synced: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
    remaining: Math.max(0, due.length - batchSize),
    message:
      due.length > batchSize
        ? `Synced ${batch.length} shops. ${due.length - batchSize} more will sync on next cron run (within 15 min).`
        : due.length > 0
          ? "All due shops synced"
          : "No shops due for sync",
    results: results.map((r) =>
      r.status === "fulfilled" ? r.value : { error: "Failed" },
    ),
  });
}
