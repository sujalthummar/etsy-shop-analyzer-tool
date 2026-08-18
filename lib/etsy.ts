const ETSY_API_BASE = "https://api.etsy.com/v3/application";

export type EtsyListing = {
  listing_id: number;
  title: string;
  description: string;
  price: { amount: number; divisor: number; currency_code: string };
  quantity: number;
  tags: string[];
  url: string;
};

function apiKeyHeader(): string {
  const keystring = process.env.ETSY_KEYSTRING;
  const sharedSecret = process.env.ETSY_SHARED_SECRET;
  if (!keystring || !sharedSecret) {
    throw new Error(
      "Missing ETSY_KEYSTRING / ETSY_SHARED_SECRET env vars. Get both from https://www.etsy.com/developers/your-apps"
    );
  }
  // As of Feb 2026, Etsy requires keystring AND shared secret combined here,
  // not just the keystring alone (older tutorials only show the keystring).
  return `${keystring}:${sharedSecret}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Accepts a shop name ("DiamZoo") or a full shop URL — with or without a
 *  locale segment like /in-en/ or /uk/ — and returns the name to search. */
function extractShopName(input: string): string {
  const match = input.match(/etsy\.com\/(?:[^/]+\/)?shop\/([^/?#]+)/i);
  return (match ? match[1] : input).trim();
}

export async function resolveShopId(
  shopNameOrUrl: string
): Promise<{ shop_id: number; shop_name: string }> {
  const shopName = extractShopName(shopNameOrUrl);
  const res = await fetch(
    `${ETSY_API_BASE}/shops?shop_name=${encodeURIComponent(shopName)}&limit=1`,
    { headers: { "x-api-key": apiKeyHeader() } }
  );
  if (!res.ok) {
    throw new Error(`Etsy API error resolving shop "${shopName}": ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`No Etsy shop found matching "${shopName}"`);
  }
  return { shop_id: data.results[0].shop_id, shop_name: data.results[0].shop_name };
}

/** Paginates through every active listing in a shop. Etsy allows up to 100 per page. */
export async function fetchAllActiveListings(etsyShopId: number): Promise<EtsyListing[]> {
  const limit = 100;
  let offset = 0;
  const all: EtsyListing[] = [];

  while (true) {
    const res = await fetch(
      `${ETSY_API_BASE}/shops/${etsyShopId}/listings/active?limit=${limit}&offset=${offset}`,
      { headers: { "x-api-key": apiKeyHeader() } }
    );
    if (!res.ok) {
      throw new Error(`Etsy API error fetching listings: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    all.push(...data.results);

    if (data.results.length < limit) break;
    offset += limit;
    await sleep(250); // stay comfortably under a 5 req/sec rate limit
  }

  return all;
}

export function priceToNumber(price: EtsyListing["price"]): number {
  if (!price || !price.divisor) return 0;
  return price.amount / price.divisor;
}
