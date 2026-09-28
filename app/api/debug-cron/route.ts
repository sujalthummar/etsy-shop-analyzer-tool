import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { getLocalTimeParts } from "@/lib/timezone";

/**
 * Debug endpoint to check why cron is not working
 * Visit: https://etsy-shop-analyzer-tool.vercel.app/api/debug-cron?secret=etsy-listing-monitor
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized - wrong or missing secret" }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  // Check 1: Do we have any shops?
  const { data: shops, error: shopErr } = await supabase.from("shops").select("*");
  
  // Check 2: Do we have any schedules?
  const { data: schedules, error: schedErr } = await supabase.from("sync_schedules").select("*");

  if (shopErr || schedErr) {
    return NextResponse.json({
      error: "Database error",
      shopError: shopErr?.message,
      scheduleError: schedErr?.message,
    }, { status: 500 });
  }

  // Check 3: Which schedules are due right now?
  const shopById = new Map((shops ?? []).map((s) => [s.id, s]));
  
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
      willSync: s.enabled && isDue && !alreadySyncedToday && shop !== undefined,
    };
  });

  return NextResponse.json({
    message: "Cron Debug Information",
    envCheck: {
      hasCronSecret: !!process.env.CRON_SECRET,
      hasEtsyKey: !!process.env.ETSY_KEYSTRING,
      hasEtsySecret: !!process.env.ETSY_SHARED_SECRET,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    database: {
      totalShops: shops?.length ?? 0,
      totalSchedules: schedules?.length ?? 0,
      shops: shops?.map(s => ({
        id: s.id,
        shopName: s.shop_name,
        etsyShopId: s.etsy_shop_id,
      })),
    },
    schedules: scheduleDetails,
    summary: {
      enabledSchedules: scheduleDetails.filter(s => s.enabled).length,
      dueSchedules: scheduleDetails.filter(s => s.isDue).length,
      willSyncNow: scheduleDetails.filter(s => s.willSync).length,
    },
  }, { status: 200 });
}
