import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { syncShop } from "@/lib/sync";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shopRowId = body?.shop_id as string | undefined;
  if (!shopRowId) {
    return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data: shop, error } = await supabase
    .from("shops")
    .select("id, etsy_shop_id, shop_name")
    .eq("id", shopRowId)
    .single();

  if (error || !shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  try {
    const result = await syncShop(shop.id, shop.etsy_shop_id);
    return NextResponse.json({ shop: shop.shop_name, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Sync failed" }, { status: 500 });
  }
}
