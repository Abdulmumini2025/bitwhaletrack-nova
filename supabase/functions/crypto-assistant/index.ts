// Supabase Edge Function: crypto-assistant
// Routes:
// GET /health
// GET /coins?source=binance|coingecko|all
// GET /coin?symbol=BTC|id=bitcoin&source=coingecko|binance|all
// GET /search?q=bitcoin|btc   -> fuzzy match across all coins (CoinGecko)
// GET /coin/details?q=bitcoin|btc or /coin/details?id=bitcoin  -> rich details
// GET /news?q=bitcoin&symbols=bitcoin,ethereum
// POST /advisor { budget:number, currency?:string, risk?:'low'|'medium'|'high' }
// Env: OPENAI_API_KEY, COINGECKO_API_KEY (optional), BINANCE_API_KEY (optional), BINANCE_API_SECRET (optional)

// Deno runtime

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const COINGECKO_API_KEY = Deno.env.get("COINGECKO_API_KEY") || "";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, init: number | ResponseInit = 200) {
  const base = typeof init === "number" ? { status: init } : init;
  return new Response(JSON.stringify(data), {
    ...base,
    headers: {
      "content-type": "application/json",
      ...CORS_HEADERS,
      ...(base?.headers ?? {}),
    },
  });
}

function badRequest(message: string) {
  return json({ error: message }, 400);
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed ${res.status} ${res.statusText}: ${text}`);
  }
  return await res.json();
}

async function listBinanceAssets(): Promise<{ symbol: string; name?: string }[]> {
  // Public endpoint; no key required
  const data = await fetchJson("https://api.binance.com/api/v3/exchangeInfo");
  // Unique base assets from symbols
  const assets = new Set<string>();
  for (const s of data.symbols ?? []) {
    if (s.status === "TRADING" && typeof s.baseAsset === "string") {
      assets.add(s.baseAsset.toUpperCase());
    }
  }
  return Array.from(assets).map((s) => ({ symbol: s }));
}

async function listCoinGeckoCoins(): Promise<{ id: string; symbol: string; name: string }[]> {
  const headers: HeadersInit = {};
  if (COINGECKO_API_KEY) headers["x-cg-pro-api-key"] = COINGECKO_API_KEY;
  const data = await fetchJson(
    "https://api.coingecko.com/api/v3/coins/list?include_platform=false",
    { headers }
  );
  return data as { id: string; symbol: string; name: string }[];
}

// Simple in-memory cache for CoinGecko coin list to reduce rate usage between cold starts
let COINGECKO_LIST_CACHE: { data: { id: string; symbol: string; name: string }[]; ts: number } | null = null;
async function getCoinGeckoListCached(): Promise<{ id: string; symbol: string; name: string }[]> {
  const now = Date.now();
  if (COINGECKO_LIST_CACHE && now - COINGECKO_LIST_CACHE.ts < 5 * 60 * 1000) {
    return COINGECKO_LIST_CACHE.data;
  }
  const data = await listCoinGeckoCoins();
  COINGECKO_LIST_CACHE = { data, ts: now };
  return data;
}

async function getCoinGeckoMarket(ids: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const headers: HeadersInit = {};
  if (COINGECKO_API_KEY) headers["x-cg-pro-api-key"] = COINGECKO_API_KEY;
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", Math.min(250, ids.length).toString());
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h,7d");
  const data = await fetchJson(url.toString(), { headers });
  return data as any[];
}

async function fetchCoinGeckoDetails(id: string): Promise<any> {
  const headers: HeadersInit = {};
  if (COINGECKO_API_KEY) headers["x-cg-pro-api-key"] = COINGECKO_API_KEY;
  const url = new URL(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}`);
  url.searchParams.set("localization", "false");
  url.searchParams.set("tickers", "false");
  url.searchParams.set("market_data", "true");
  url.searchParams.set("community_data", "false");
  url.searchParams.set("developer_data", "false");
  url.searchParams.set("sparkline", "false");
  return await fetchJson(url.toString(), { headers });
}

async function getBinanceTicker(usdtSymbol: string) {
  // Example: BTC -> BTCUSDT
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(usdtSymbol)}USDT`;
  try {
    const data = await fetchJson(url);
    return data;
  } catch {
    return null;
  }
}

async function openAiCompletion(system: string, user: string): Promise<string> {
  if (!OPENAI_API_KEY) return "";
  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.4,
  };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${t}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim?.() ?? "";
}

async function handleCoins(url: URL) {
  const source = (url.searchParams.get("source") || "all").toLowerCase();
  const tasks: Promise<any>[] = [];
  if (source === "binance" || source === "all") tasks.push(listBinanceAssets());
  if (source === "coingecko" || source === "all") tasks.push(listCoinGeckoCoins());

  const results = await Promise.all(tasks);
  let payload: any = {};
  if (source === "binance") {
    payload = { binance: results[0] };
  } else if (source === "coingecko") {
    payload = { coingecko: results[0] };
  } else {
    payload = { binance: results[0], coingecko: results[1] };
  }
  return json(payload);
}

function normalize(str: string) {
  return (str || "").toLowerCase().trim();
}

async function resolveCoinGeckoId(query: string): Promise<{ id?: string; candidates?: { id: string; symbol: string; name: string }[] }>
{
  const q = normalize(query);
  const list = await getCoinGeckoListCached();
  // 1) exact symbol match
  const exactSymbol = list.find((c) => normalize(c.symbol) === q);
  if (exactSymbol) return { id: exactSymbol.id };
  // 2) exact name match
  const exactName = list.find((c) => normalize(c.name) === q);
  if (exactName) return { id: exactName.id };
  // 3) startsWith symbol/name
  const starts = list.filter((c) => normalize(c.symbol).startsWith(q) || normalize(c.name).startsWith(q)).slice(0, 10);
  if (starts.length === 1) return { id: starts[0].id };
  if (starts.length > 1) return { candidates: starts };
  // 4) includes symbol/name
  const includes = list.filter((c) => normalize(c.symbol).includes(q) || normalize(c.name).includes(q)).slice(0, 10);
  if (includes.length === 1) return { id: includes[0].id };
  if (includes.length > 1) return { candidates: includes };
  return { candidates: [] };
}

async function handleCoin(url: URL) {
  const symbol = url.searchParams.get("symbol")?.toUpperCase();
  const id = url.searchParams.get("id")?.toLowerCase();
  const source = (url.searchParams.get("source") || "all").toLowerCase();
  const q = url.searchParams.get("q") || "";
  if (!symbol && !id) return badRequest("Provide symbol or id");

  const responses: Record<string, any> = {};

  if (source === "binance" || source === "all") {
    if (symbol) {
      responses.binance = await getBinanceTicker(symbol);
    }
  }

  if (source === "coingecko" || source === "all") {
    const ids: string[] = [];
    if (id) ids.push(id);
    // Best-effort symbol->id: download list and match first occurrence
    if (!id && (symbol || q)) {
      const resolved = await resolveCoinGeckoId(symbol || q);
      if (resolved.id) ids.push(resolved.id);
    }
    const markets = await getCoinGeckoMarket(ids);
    responses.coingecko = markets?.[0] ?? null;
  }

  return json(responses);
}

async function handleSearch(url: URL) {
  const q = url.searchParams.get("q") || "";
  if (!q) return badRequest("Missing q");
  const list = await getCoinGeckoListCached();
  const qn = normalize(q);
  const matches = list
    .filter((c) => normalize(c.symbol) === qn || normalize(c.name) === qn || normalize(c.symbol).startsWith(qn) || normalize(c.name).startsWith(qn) || normalize(c.symbol).includes(qn) || normalize(c.name).includes(qn))
    .slice(0, 25);
  return json({ query: q, results: matches });
}

async function handleCoinDetails(url: URL) {
  const id = url.searchParams.get("id")?.toLowerCase() || "";
  const q = url.searchParams.get("q") || "";
  let targetId = id;
  if (!targetId && q) {
    const resolved = await resolveCoinGeckoId(q);
    if (resolved.id) targetId = resolved.id;
    else return json({ query: q, candidates: resolved.candidates || [] }, 200);
  }
  if (!targetId) return badRequest("Provide id or q");

  const details = await fetchCoinGeckoDetails(targetId);
  const m = details?.market_data || {};
  const payload = {
    id: details?.id,
    symbol: details?.symbol?.toUpperCase?.() || "",
    name: details?.name || "",
    genesis_date: details?.genesis_date || null,
    hashing_algorithm: details?.hashing_algorithm || null,
    categories: details?.categories || [],
    homepage: details?.links?.homepage?.[0] || null,
    market_cap_rank: details?.market_cap_rank ?? null,
    current_price: m?.current_price?.usd ?? null,
    market_cap: m?.market_cap?.usd ?? null,
    total_volume: m?.total_volume?.usd ?? null,
    circulating_supply: m?.circulating_supply ?? null,
    total_supply: m?.total_supply ?? null,
    max_supply: m?.max_supply ?? null,
    ath: m?.ath?.usd ?? null,
    ath_change_percentage: m?.ath_change_percentage?.usd ?? null,
    atl: m?.atl?.usd ?? null,
    atl_change_percentage: m?.atl_change_percentage?.usd ?? null,
    price_change_percentage_24h: m?.price_change_percentage_24h ?? null,
    price_change_percentage_7d: m?.price_change_percentage_7d ?? null,
    last_updated: details?.last_updated || null,
  };

  // Optional concise description via OpenAI
  let summary = "";
  if (OPENAI_API_KEY) {
    const cleanDesc = (details?.description?.en || "").replace(/\s+/g, " ").slice(0, 1200);
    const sys = "Summarize the following coin for a general crypto user in 3 sentences. Be factual, neutral, and avoid advice.";
    const usr = `Name: ${payload.name} (${payload.symbol})\n\nDescription: ${cleanDesc}`;
    try {
      summary = await openAiCompletion(sys, usr);
    } catch (_) {
      summary = "";
    }
  }

  return json({ ...payload, summary });
}

async function handleNews(url: URL) {
  const q = url.searchParams.get("q") || "";
  const symbolsParam = url.searchParams.get("symbols") || "";
  const ids = symbolsParam
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);

  const markets = ids.length > 0 ? await getCoinGeckoMarket(ids) : [];
  const snapshot = markets.map((m) => ({
    id: m.id,
    symbol: m.symbol,
    name: m.name,
    price: m.current_price,
    change_24h: m.price_change_percentage_24h,
    change_7d: m.price_change_percentage_7d_in_currency,
    market_cap: m.market_cap,
  }));

  const system = "You are a concise, neutral crypto news analyst. Avoid hype. Include recent price context only; do not fabricate news.";
  const user = `Provide a short news summary for: ${q || ids.join(", ")}. Use the following market snapshot for context: ${JSON.stringify(
    snapshot
  )}`;
  const content = OPENAI_API_KEY ? await openAiCompletion(system, user) : "";
  return json({ query: q, ids, snapshot, content, disclaimer: "Informational only. Not financial advice." });
}

type RiskLevel = "low" | "medium" | "high";

function computeWeights(risk: RiskLevel): { [key: string]: number } {
  // Baseline allocation among core assets; remainder spread across top alts
  if (risk === "low") return { btc: 0.55, eth: 0.30, alts: 0.15 };
  if (risk === "high") return { btc: 0.35, eth: 0.25, alts: 0.40 };
  return { btc: 0.45, eth: 0.30, alts: 0.25 };
}

function pickAlts(markets: any[], count: number): any[] {
  // Skip BTC/ETH, choose next by market cap and relatively lower 24h volatility first
  const filtered = markets.filter((m) => !["bitcoin", "ethereum"].includes(m.id));
  filtered.sort((a, b) => {
    const volA = Math.abs(a.price_change_percentage_24h ?? 0);
    const volB = Math.abs(b.price_change_percentage_24h ?? 0);
    if (a.market_cap === b.market_cap) return volA - volB;
    return (b.market_cap ?? 0) - (a.market_cap ?? 0);
  });
  return filtered.slice(0, count);
}

async function handleAdvisor(req: Request) {
  const body = await req.json().catch(() => ({}));
  const budgetRaw = Number(body?.budget);
  const risk: RiskLevel = ["low", "medium", "high"].includes((body?.risk || "").toLowerCase())
    ? (body.risk.toLowerCase() as RiskLevel)
    : "medium";
  const currency = (body?.currency || "usd").toLowerCase();

  if (!Number.isFinite(budgetRaw) || budgetRaw <= 0) return badRequest("Invalid budget");
  const budget = Math.min(Math.max(budgetRaw, 10), 1000000); // clamp 10..1,000,000

  const headers: HeadersInit = {};
  if (COINGECKO_API_KEY) headers["x-cg-pro-api-key"] = COINGECKO_API_KEY;
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", currency);
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h,7d");
  const markets = (await fetchJson(url.toString(), { headers })) as any[];

  const btc = markets.find((m) => m.id === "bitcoin");
  const eth = markets.find((m) => m.id === "ethereum");
  const alts = pickAlts(markets, 8);
  const weights = computeWeights(risk);

  const targets = [
    ...(btc ? [{ ref: btc, target: weights.btc }] : []),
    ...(eth ? [{ ref: eth, target: weights.eth }] : []),
    ...alts.map((m) => ({ ref: m, target: weights.alts / Math.max(alts.length, 1) })),
  ];

  const allocations = targets.map(({ ref, target }) => {
    const amount_usd = +(budget * target).toFixed(2);
    const price = Number(ref.current_price) || 0;
    const quantity = price > 0 ? +(amount_usd / price).toFixed(6) : 0;
    return {
      id: ref.id,
      symbol: String(ref.symbol || "").toUpperCase(),
      name: ref.name,
      weight_pct: +(target * 100).toFixed(2),
      price,
      amount_usd,
      quantity,
    };
  });

  const system = "You are a pragmatic crypto allocation assistant. Provide brief, neutral rationale and risk caveats. Do not overpromise returns.";
  const user = `Given a budget of $${budget} and ${risk} risk tolerance, explain the rationale for an allocation focused on BTC, ETH and a diversified basket of large-cap altcoins. Keep it under 120 words.`;
  const explanation = OPENAI_API_KEY ? await openAiCompletion(system, user) : "";

  return json({
    currency: currency.toUpperCase(),
    budget,
    risk,
    allocations,
    explanation,
    disclaimer: "This is informational only and not financial advice. Crypto is volatile; do your own research.",
  });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    if (url.pathname.endsWith("/health")) {
      return json({ ok: true });
    }
    if (url.pathname.endsWith("/coins") && req.method === "GET") {
      return await handleCoins(url);
    }
    if (url.pathname.endsWith("/coin") && req.method === "GET") {
      return await handleCoin(url);
    }
    if (url.pathname.endsWith("/search") && req.method === "GET") {
      return await handleSearch(url);
    }
    if (url.pathname.endsWith("/coin/details") && req.method === "GET") {
      return await handleCoinDetails(url);
    }
    if (url.pathname.endsWith("/news") && req.method === "GET") {
      return await handleNews(url);
    }
    if (url.pathname.endsWith("/advisor") && req.method === "POST") {
      return await handleAdvisor(req);
    }
    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("crypto-assistant error:", err);
    return json({ error: String(err?.message || err) }, 500);
  }
});