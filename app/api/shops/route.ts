import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { resolveShopId } from "@/lib/etsy";

export async function GET() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("shops")
    .select("id, etsy_shop_id, shop_name, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shops: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const input = body?.shop as string | undefined;
  if (!input || !input.trim()) {
    return NextResponse.json({ error: "Provide a shop name or Etsy shop URL." }, { status: 400 });
  }

  try {
    const { shop_id, shop_name } = await resolveShopId(input);

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("shops")
      .upsert(
        { etsy_shop_id: shop_id, shop_name },
        { onConflict: "etsy_shop_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ shop: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to add shop" }, { status: 400 });
  }
}
