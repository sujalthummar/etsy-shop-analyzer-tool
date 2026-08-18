import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");

  const supabase = getSupabaseServer();
  let query = supabase
    .from("listing_changes")
    .select("detected_at, listing_id, listing_title, field, old_value, new_value, listing_url")
    .order("detected_at", { ascending: false });

  if (shopId) query = query.eq("shop_id", shopId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = ["Detected At", "Listing ID", "Product Title", "Field Changed", "Old Value", "New Value", "URL"];
  const rows = (data ?? []).map((r: any) => [
    r.detected_at,
    r.listing_id,
    r.listing_title,
    r.field,
    r.old_value,
    r.new_value,
    r.listing_url,
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="listing-changes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
