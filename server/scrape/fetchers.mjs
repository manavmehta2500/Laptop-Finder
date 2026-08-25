/**
 * Scraping primitives. Every fetcher is defensive: on any failure it returns
 * null instead of throwing, so one stubborn site can never kill a run.
 */
import { pickBest } from './matcher.mjs';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export async function fetchPage(url, { timeout = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    if (!res.ok) return { status: res.status, html: null, json: null };
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    if (ct.includes('application/json')) {
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        /* not json after all */
      }
      return { status: res.status, html: null, json, text };
    }
    return { status: res.status, html: text, json: null, text };
  } catch (e) {
    return { status: 0, error: e.name === 'AbortError' ? 'timeout' : String(e.message || e), html: null, json: null };
  } finally {
    clearTimeout(t);
  }
}

/* ── JSON-LD ─────────────────────────────────────────────────────────────── */

export function extractLdJsonBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const v = JSON.parse(m[1]);
      if (Array.isArray(v)) blocks.push(...v);
      else if (v && typeof v === 'object') blocks.push(v);
    } catch {
      /* ignore malformed block */
    }
  }
  return blocks;
}

const isOffer = (o) => o && typeof o === 'object' && (o['@type'] === 'Offer' || o['@type'] === 'AggregateOffer' || o.price != null);

function priceFromNode(node) {
  let o = node.offers;
  if (Array.isArray(o)) o = o.find(isOffer) || o[0];
  if (!isOffer(o)) return null;
  const price = parseFloat(String(o.price ?? o.lowPrice ?? '').replace(/[^0-9.]/g, ''));
  if (!isFinite(price) || price <= 0) return null;
  const availability = String(o.availability || '').toLowerCase();
  const inStock = !availability || availability.includes('instock') || availability.includes('in stock');
  return { price, currency: o.priceCurrency || null, inStock };
}

export function productPriceFromLd(blocks) {
  const walk = (nodes) => {
    for (const n of nodes) {
      if (!n || typeof n !== 'object') continue;
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      if (types.includes('Product') || types.includes('IndividualProduct')) {
        const p = priceFromNode(n);
        if (p) return p;
      }
      for (const k of Object.keys(n)) {
        const v = n[k];
        if (Array.isArray(v)) {
          const r = walk(v);
          if (r) return r;
        } else if (v && typeof v === 'object' && k !== 'offers') {
          const r = walk([v]);
          if (r) return r;
        }
      }
    }
    return null;
  };
  return walk(blocks);
}

/* ── generic helpers ─────────────────────────────────────────────────────── */

export function extractProductLinks(html, host) {
  const links = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,400}?)<\/a>/gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(html))) {
    const href = m[1];
    if (!/https?:|^\/\//.test(href) && !href.startsWith('/')) continue;
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const full = href.startsWith('http') ? href : `https://${host}${href.startsWith('/') ? '' : '/'}${href}`;
    if (seen.has(full)) continue;
    seen.add(full);
    if (text.length > 8) links.push({ href: full, title: text.slice(0, 160) });
  }
  return links;
}

/* ── scrapers ────────────────────────────────────────────────────────────── */

/** Fetch a product page and read its JSON-LD price. */
export async function scrapeJsonLd(url, host, siteBrand) {
  const page = await fetchPage(url);
  if (!page.html) return { ok: false, note: `http ${page.status} ${page.error ?? ''}`.trim() };
  const blocks = extractLdJsonBlocks(page.html);
  const p = productPriceFromLd(blocks);
  if (!p) return { ok: false, note: 'no price in page (no JSON-LD offer)' };
  const cur = (p.currency || '').toUpperCase();
  return { ok: true, price: p.price, currency: cur, inStock: p.inStock };
}

/** Fetch a search page, use the matcher to pick the product, then read its price. */
export async function scrapeSearchThenJsonLd(searchUrl, query, host, siteBrand, productUrlRe) {
  const page = await fetchPage(searchUrl);
  if (!page.html) return { ok: false, note: `search http ${page.status} ${page.error ?? ''}`.trim() };

  const links = extractProductLinks(page.html, host);
  // narrow to product-ish links first
  const pool = productUrlRe ? links.filter((l) => productUrlRe.test(l.href)) : links;
  const candidates = (pool.length >= 3 ? pool : links).map((l) => ({ ...l }));
  const pick = pickBest(candidates, query, siteBrand, 55);
  if (!pick) {
    // maybe the page itself is a product page with JSON-LD
    const p = productPriceFromLd(extractLdJsonBlocks(page.html));
    if (p) return { ok: true, price: p.price, currency: (p.currency || '').toUpperCase(), inStock: p.inStock, url: searchUrl };
    return { ok: false, note: 'no matching product in search results' };
  }
  const r = await scrapeJsonLd(pick.href, host, siteBrand);
  if (r.ok) r.url = pick.href;
  return r;
}

/** Micro Center: server-rendered search page with product links + price blobs. */
export async function scrapeMicroCenter(query) {
  const host = 'www.microcenter.com';
  const url = `https://${host}/search/search_results.aspx?q=${encodeURIComponent(query)}`;
  const page = await fetchPage(url);
  if (!page.html) return { ok: false, note: `http ${page.status} ${page.error ?? ''}`.trim() };

  // product links look like /product/123456/slug
  const links = extractProductLinks(page.html, host).filter((l) => /\/product\/\d+\//.test(l.href));
  const pick = pickBest(links, query, 'MSI', 45) || pickBest(links, query, null, 45);
  if (!pick) return { ok: false, note: 'no matching product in results' };

  const prod = await fetchPage(pick.href);
  if (!prod.html) return { ok: false, note: `product http ${prod.status}` };
  const ld = productPriceFromLd(extractLdJsonBlocks(prod.html));
  if (ld) return { ok: true, price: ld.price, currency: (ld.currency || 'USD').toUpperCase(), inStock: ld.inStock, url: pick.href };
  // fallback: "Our price $1,299.99"
  const m = prod.html.match(/Our price\s*\$?([\d,]+\.?\d*)/);
  if (!m) return { ok: false, note: 'no price found on product page' };
  return { ok: true, price: parseFloat(m[1].replace(/,/g, '')), currency: 'USD', inStock: true, url: pick.href };
}

/** Shopify stores (Framework): /products/<handle>.js returns clean JSON. */
export async function scrapeShopify(store, handle) {
  const url = `https://${store}/products/${handle}.js`;
  const page = await fetchPage(url);
  if (!page.json) return { ok: false, note: `shopify http ${page.status} ${page.error ?? ''}`.trim() };
  const variants = page.json.variants || [];
  if (!variants.length) return { ok: false, note: 'no variants' };
  // pick the variant with a real price that is available
  const v = variants.find((x) => x.available && x.price > 0) || variants[0];
  return {
    ok: true,
    price: v.price / 100,
    currency: (page.json.currency || 'USD').toUpperCase(),
    inStock: Boolean(v.available),
    url: `https://${store}/products/${handle}`,
  };
}

/** Apple: buy pages embed the price in JSON-LD; fallback to visible "From $X". */
export async function scrapeApple(url) {
  const r = await scrapeJsonLd(url, 'www.apple.com', 'Apple');
  if (r.ok) return r;
  const page = await fetchPage(url);
  if (page.html) {
    const m = page.html.match(/\$\s?([\d,]+(?:\.\d{2})?)/);
    if (m) return { ok: true, price: parseFloat(m[1].replace(/,/g, '')), currency: 'USD', inStock: true, url };
  }
  return { ok: false, note: 'no price found (Apple)' };
}
