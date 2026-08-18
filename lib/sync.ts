import { getSupabaseServer } from "@/lib/supabase";
import { fetchAllActiveListings, priceToNumber } from "@/lib/etsy";
import { diffSnapshots, SnapshotRow } from "@/lib/diff";

/** Runs one full sync for a single tracked shop: fetch -> snapshot -> diff -> store. */
export async function syncShop(shopRowId: string, etsyShopId: number) {
  const supabase = getSupabaseServer();
  const listings = await fetchAllActiveListings(etsyShopId);
  const runId = crypto.randomUUID();

  let changesDetected = 0;
  let newListings = 0;
  let removedListings = 0;

  // Find the most recent PRIOR run (before this one) so we can tell which
  // listings existed last time. Comparing against only the immediately
  // previous run — not all-time history — means a listing that already got
  // flagged as removed won't be flagged again on every later sync.
  const { data: lastSnapshotRow, error: lastRunErr } = await supabase
    .from("listing_snapshots")
    .select("run_id")
    .eq("shop_id", shopRowId)
    .order("taken_at", { ascending: false })
    .limit(1);
  if (lastRunErr) throw lastRunErr;
  const previousRunId = lastSnapshotRow?.[0]?.run_id as string | undefined;
  const isFirstSyncEver = !previousRunId;

  let previousRunListings: { listing_id: number; title: string | null; price: number | null }[] = [];
  if (previousRunId) {
    const { data, error } = await supabase
      .from("listing_snapshots")
      .select("listing_id, title, price")
      .eq("shop_id", shopRowId)
      .eq("run_id", previousRunId);
    if (error) throw error;
    previousRunListings = data ?? [];
  }

  const seenListingIds = new Set<number>();

  for (const listing of listings) {
    seenListingIds.add(listing.listing_id);

    const current: SnapshotRow = {
      title: listing.title,
      description: listing.description,
      price: priceToNumber(listing.price),
      quantity: listing.quantity,
      tags: listing.tags,
    };

    // Most recent previous snapshot for this exact listing, if any.
    const { data: previousRows, error: prevErr } = await supabase
      .from("listing_snapshots")
      .select("title, description, price, quantity, tags")
      .eq("shop_id", shopRowId)
      .eq("listing_id", listing.listing_id)
      .order("taken_at", { ascending: false })
      .limit(1);

    if (prevErr) throw prevErr;
    const previous = previousRows?.[0] as SnapshotRow | undefined;

    // Always store the new snapshot so future syncs have something to diff against.
    const { error: insertErr } = await supabase.from("listing_snapshots").insert({
      shop_id: shopRowId,
      listing_id: listing.listing_id,
      run_id: runId,
      title: current.title,
      description: current.description,
      price: current.price,
      currency_code: listing.price?.currency_code ?? null,
      quantity: current.quantity,
      tags: current.tags,
    });
    if (insertErr) throw insertErr;

    if (!previous) {
      newListings++;
      if (!isFirstSyncEver) {
        const { error: newListingErr } = await supabase.from("listing_changes").insert({
          shop_id: shopRowId,
          listing_id: listing.listing_id,
          listing_title: current.title,
          listing_url: listing.url ?? null,
          field: "new_listing",
          old_value: "",
          new_value: `Added to shop — ${current.price ?? ""} ${listing.price?.currency_code ?? ""}`.trim(),
        });
        if (newListingErr) throw newListingErr;
        changesDetected += 1;
      }
      continue; // nothing to field-diff a brand-new listing against
    }

    const fieldChanges = diffSnapshots(previous, current);
    if (fieldChanges.length > 0) {
      const rows = fieldChanges.map((c) => ({
        shop_id: shopRowId,
        listing_id: listing.listing_id,
        listing_title: current.title,
        listing_url: listing.url ?? null,
        field: c.field,
        old_value: c.old_value,
        new_value: c.new_value,
      }));
      const { error: changeErr } = await supabase.from("listing_changes").insert(rows);
      if (changeErr) throw changeErr;
      changesDetected += fieldChanges.length;
    }
  }

  // Anything present in the previous run but missing from this one has been
  // deleted, deactivated, or expired on Etsy's side.
  const removed = previousRunListings.filter((l) => !seenListingIds.has(l.listing_id));
  for (const listing of removed) {
    const { error: removedErr } = await supabase.from("listing_changes").insert({
      shop_id: shopRowId,
      listing_id: listing.listing_id,
      listing_title: listing.title,
      listing_url: `https://www.etsy.com/listing/${listing.listing_id}`,
      field: "removed",
      old_value: "Active",
      new_value: "No longer active (removed, sold out, or expired)",
    });
    if (removedErr) throw removedErr;
    removedListings++;
    changesDetected += 1;
  }

  return { totalListings: listings.length, newListings, removedListings, changesDetected };
}
