import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { syncShop } from "@/lib/sync";

/**
 * Optional: wire this up to a scheduler (e.g. Vercel Cron) to sync every
 * tracked shop automatically instead of clicking "Sync now" by hand.
 * Protected by CRON_SECRET so randoms on the internet can't trigger it.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const { data: shops, error } = await supabase.from("shops").select("id, etsy_shop_id, shop_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const shop of shops ?? []) {
    try {
      const result = await syncShop(shop.id as string, shop.etsy_shop_id as number);
      results.push({ shop: shop.shop_name, ...result });
    } catch (err: any) {
      results.push({ shop: shop.shop_name, error: err.message });
    }
  }

  return NextResponse.json({ results });
}
