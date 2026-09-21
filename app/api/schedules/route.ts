import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { Database } from "@/lib/database.types";

type ScheduleUpdate = Database["public"]["Tables"]["sync_schedules"]["Update"];

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const supabase = getSupabaseServer();

  let query = supabase.from("sync_schedules").select("*").order("created_at", { ascending: true });
  if (shopId) query = query.eq("shop_id", shopId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedules: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shopId = body?.shop_id as string | undefined;
  const hour = body?.hour;
  const minute = body?.minute;
  const timezone = body?.timezone as string | undefined;

  if (!shopId || typeof hour !== "number" || typeof minute !== "number" || !timezone) {
    return NextResponse.json({ error: "shop_id, hour, minute, and timezone are required" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("sync_schedules")
    .insert({ shop_id: shopId, hour, minute, timezone })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const update: ScheduleUpdate = {};
  if (typeof body.enabled === "boolean") update.enabled = body.enabled;
  if (typeof body.hour === "number") update.hour = body.hour;
  if (typeof body.minute === "number") update.minute = body.minute;
  if (typeof body.timezone === "string") update.timezone = body.timezone;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from("sync_schedules").update(update).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = getSupabaseServer();
  const { error } = await supabase.from("sync_schedules").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
