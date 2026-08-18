import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 200);

  const supabase = getSupabaseServer();
  let query = supabase
    .from("listing_changes")
    .select("id, shop_id, listing_id, listing_title, listing_url, field, old_value, new_value, detected_at")
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (shopId) query = query.eq("shop_id", shopId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ changes: data });
}
