"use client";

import { useState, useEffect, useCallback } from "react";

type Shop = {
  id: string;
  etsy_shop_id: number;
  shop_name: string;
  created_at: string;
};
type Change = {
  id: string;
  shop_id: string;
  listing_id: number;
  listing_title: string;
  listing_url: string | null;
  field: string;
  old_value: string;
  new_value: string;
  detected_at: string;
};

const FIELD_LABEL: Record<string, string> = {
  title: "Title",
  description: "Description",
  price: "Price",
  quantity: "Quantity",
  tags: "Tags",
  new_listing: "New listing",
  removed: "Removed / inactive",
};

function truncate(s: string, n = 90) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function ChangesTable({ changes }: { changes: Change[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-3 font-medium">Detected</th>
            <th className="px-5 py-3 font-medium">Product</th>
            <th className="px-5 py-3 font-medium">Field</th>
            <th className="px-5 py-3 font-medium">Before</th>
            <th className="px-5 py-3 font-medium">After</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.id} className="border-b border-line/60 align-top">
              <td className="whitespace-nowrap px-5 py-3 text-muted">
                {new Date(c.detected_at).toLocaleString()}
              </td>
              <td className="px-5 py-3">
                {c.listing_url ? (
                  <a
                    href={c.listing_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline"
                  >
                    {truncate(c.listing_title, 50)}
                  </a>
                ) : (
                  truncate(c.listing_title, 50)
                )}
              </td>
              <td className="px-5 py-3">
                <span className="rounded-full bg-paper px-2 py-0.5 text-xs">
                  {FIELD_LABEL[c.field] ?? c.field}
                </span>
              </td>
              <td className="max-w-xs px-5 py-3 text-muted">
                {truncate(c.old_value)}
              </td>
              <td className="max-w-xs px-5 py-3">{truncate(c.new_value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ProductGroupData = {
  listingId: number;
  title: string;
  url: string | null;
  rows: Change[];
};

/** One group per listing_id. Each group's own rows are oldest-first, so the
 *  before→after chain reads top-to-bottom the way it actually happened.
 *  Groups themselves are ordered by whichever product changed most recently. */
function groupByProduct(rows: Change[]): ProductGroupData[] {
  const map = new Map<number, Change[]>();
  for (const c of rows) {
    if (!map.has(c.listing_id)) map.set(c.listing_id, []);
    map.get(c.listing_id)!.push(c);
  }
  const groups = Array.from(map.entries()).map(([listingId, changeRows]) => {
    const sorted = [...changeRows].sort(
      (a, b) =>
        new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime(),
    );
    const latest = sorted[sorted.length - 1];
    return {
      listingId,
      title: latest.listing_title,
      url: latest.listing_url,
      rows: sorted,
    };
  });
  groups.sort(
    (a, b) =>
      new Date(b.rows[b.rows.length - 1].detected_at).getTime() -
      new Date(a.rows[a.rows.length - 1].detected_at).getTime(),
  );
  return groups;
}

function ProductGroup({ group }: { group: ProductGroupData }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="border-b border-line/60 last:border-b-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-2.5 text-left"
      >
        <span className="text-sm font-medium text-ink">
          {group.url ? (
            <a
              href={group.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-accent hover:underline"
            >
              {truncate(group.title, 60)}
            </a>
          ) : (
            truncate(group.title, 60)
          )}
          <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs text-muted">
            {group.rows.length} change{group.rows.length > 1 ? "s" : ""}
          </span>
        </span>
        <span className="text-xs text-muted">
          {expanded ? "▾ hide" : "▸ show"}
        </span>
      </button>
      {expanded && (
        <div className="overflow-x-auto px-5 pb-3">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4 font-medium">Detected</th>
                <th className="py-2 pr-4 font-medium">Field</th>
                <th className="py-2 pr-4 font-medium">Before</th>
                <th className="py-2 font-medium">After</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-line/40 align-top last:border-b-0"
                >
                  <td className="whitespace-nowrap py-2 pr-4 text-muted">
                    {new Date(c.detected_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="rounded-full bg-paper px-2 py-0.5 text-xs">
                      {FIELD_LABEL[c.field] ?? c.field}
                    </span>
                  </td>
                  <td className="max-w-xs py-2 pr-4 text-muted">
                    {truncate(c.old_value)}
                  </td>
                  <td className="max-w-xs py-2">{truncate(c.new_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChangesView({
  changes,
  viewMode,
}: {
  changes: Change[];
  viewMode: "time" | "product";
}) {
  if (viewMode === "time") return <ChangesTable changes={changes} />;
  const groups = groupByProduct(changes);
  return (
    <div>
      {groups.map((g) => (
        <ProductGroup key={g.listingId} group={g} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("all");
  const [shopInput, setShopInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [viewMode, setViewMode] = useState<"product" | "time">("product");

  const loadShops = useCallback(async () => {
    const res = await fetch("/api/shops");
    const data = await res.json();
    if (res.ok) setShops(data.shops ?? []);
  }, []);

  const loadChanges = useCallback(async (shopId: string) => {
    setLoadingChanges(true);
    const url =
      shopId === "all" ? "/api/changes" : `/api/changes?shop_id=${shopId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) setChanges(data.changes ?? []);
    setLoadingChanges(false);
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  useEffect(() => {
    loadChanges(selectedShop);
  }, [selectedShop, loadChanges]);

  async function addShop(e: React.FormEvent) {
    e.preventDefault();
    if (!shopInput.trim()) return;
    setAdding(true);
    setStatusMsg(null);
    const res = await fetch("/api/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop: shopInput.trim() }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setStatusMsg(`Could not add shop: ${data.error}`);
      return;
    }
    setShopInput("");
    setStatusMsg(
      `Added "${data.shop.shop_name}". Click "Sync now" to pull its listings for the first time.`,
    );
    loadShops();
  }

  async function syncShop(shop: Shop) {
    setSyncingId(shop.id);
    setStatusMsg(null);
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shop.id }),
    });
    const data = await res.json();
    setSyncingId(null);
    if (!res.ok) {
      setStatusMsg(`Sync failed for ${shop.shop_name}: ${data.error}`);
      return;
    }
    setStatusMsg(
      `${shop.shop_name}: checked ${data.totalListings} listings — ${data.changesDetected} change(s) (${data.newListings} new, ${data.removedListings} removed/inactive).`,
    );
    loadChanges(selectedShop);
  }

  function exportCsv(shopId: string) {
    const url =
      shopId === "all" ? "/api/export" : `/api/export?shop_id=${shopId}`;
    window.location.href = url;
  }

  const shopNameById = new Map(shops.map((s) => [s.id, s.shop_name]));

  // When viewing "All shops", split the flat change list into one group per
  // shop so each shop gets its own labelled table instead of one mixed list.
  const groupedByShop: { shopId: string; shopName: string; rows: Change[] }[] =
    selectedShop === "all"
      ? Array.from(
          changes.reduce((acc, c) => {
            if (!acc.has(c.shop_id)) acc.set(c.shop_id, []);
            acc.get(c.shop_id)!.push(c);
            return acc;
          }, new Map<string, Change[]>()),
        ).map(([shopId, rows]) => ({
          shopId,
          shopName: shopNameById.get(shopId) ?? "Unknown shop",
          rows,
        }))
      : [
          {
            shopId: selectedShop,
            shopName: shopNameById.get(selectedShop) ?? "",
            rows: changes,
          },
        ];

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 lg:px-20">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Etsy Listing Monitor
          </h1>
          <p className="mt-1 text-sm text-muted">
            Track any Etsy shop and see exactly what changed — title,
            description, price, tags — listing by listing.
          </p>
        </header>

        <section className="mb-8 rounded-xl border border-line bg-white p-5">
          <form onSubmit={addShop} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={shopInput}
              onChange={(e) => setShopInput(e.target.value)}
              placeholder="Shop name or URL, e.g. DiamZoo or etsy.com/shop/DiamZoo"
              className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={adding}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add shop"}
            </button>
          </form>
          {statusMsg && <p className="mt-3 text-sm text-muted">{statusMsg}</p>}
        </section>

        {shops.length > 0 && (
          <section className="mb-8 flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedShop("all")}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                selectedShop === "all"
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-ink"
              }`}
            >
              All shops
            </button>
            {shops.map((shop) => (
              <div
                key={shop.id}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                  selectedShop === shop.id
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-white text-ink"
                }`}
              >
                <button onClick={() => setSelectedShop(shop.id)}>
                  {shop.shop_name}
                </button>
                <button
                  onClick={() => syncShop(shop)}
                  disabled={syncingId === shop.id}
                  title="Sync now"
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    selectedShop === shop.id ? "bg-white/20" : "bg-paper"
                  } disabled:opacity-50`}
                >
                  {syncingId === shop.id ? "Syncing…" : "⟳ Sync"}
                </button>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-xl border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Detected changes</h2>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-line p-0.5 text-xs">
                <button
                  onClick={() => setViewMode("product")}
                  className={`rounded-md px-2.5 py-1 ${
                    viewMode === "product" ? "bg-ink text-white" : "text-muted"
                  }`}
                >
                  By product
                </button>
                <button
                  onClick={() => setViewMode("time")}
                  className={`rounded-md px-2.5 py-1 ${viewMode === "time" ? "bg-ink text-white" : "text-muted"}`}
                >
                  By time
                </button>
              </div>
              <button
                onClick={() => exportCsv(selectedShop)}
                disabled={changes.length === 0}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-40"
              >
                Export CSV {selectedShop === "all" ? "(all shops)" : ""}
              </button>
            </div>
          </div>

          {loadingChanges ? (
            <p className="px-5 py-8 text-sm text-muted">Loading…</p>
          ) : changes.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">
              No changes recorded yet. Add a shop above and click "Sync now" —
              the first sync sets the baseline, and changes will show up
              starting from the second sync.
            </p>
          ) : selectedShop !== "all" ? (
            <ChangesView changes={changes} viewMode={viewMode} />
          ) : (
            groupedByShop.map((group, i) => (
              <div
                key={group.shopId}
                className={i > 0 ? "border-t border-line" : ""}
              >
                <div className="flex items-center justify-between bg-paper/60 px-5 py-2.5">
                  <h3 className="text-sm font-semibold text-ink">
                    {group.shopName}
                  </h3>
                  <button
                    onClick={() => exportCsv(group.shopId)}
                    className="text-xs font-medium text-muted hover:text-ink"
                  >
                    Export CSV
                  </button>
                </div>
                <ChangesView changes={group.rows} viewMode={viewMode} />
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
