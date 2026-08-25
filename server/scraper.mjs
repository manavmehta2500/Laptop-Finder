/**
 * The live monitor: real scraping of the tracked websites.
 *
 * Each offer in the catalog carries a `scrape` config:
 *   { kind: 'jsonld'  , url }                    — product page, read JSON-LD price
 *   { kind: 'search'  , url, host, productUrlRe, brand } — search page → matcher picks product → JSON-LD
 *   { kind: 'mc' }                                — Micro Center server-rendered search
 *   { kind: 'shopify' , store, handle }           — Shopify /products/<handle>.js
 *   { kind: 'apple'   , url }                     — Apple buy page
 *   { kind: 'skip' }                              — keep last known price (site blocks datacenter IPs / needs an API key)
 *
 * Any failure degrades gracefully: the last verified price is kept and the
 * offer is marked `verified: false`.
 */
import { FX_RATES } from '../src/data/config.mjs';
import * as F from './scrape/fetchers.mjs';

function convert(price, from, to) {
  if (!from || !to || !FX_RATES[from] || !FX_RATES[to]) return price;
  return (price * FX_RATES[to]) / FX_RATES[from];
}

export async function scrapeOffer(offer, laptop, log = () => {}) {
  const sc = offer.scrape;
  if (!sc || sc.kind === 'skip') return { ok: false, skipped: true, note: 'not scraped (site needs API key or blocks bots)' };
  const query = sc.query || laptop.name;
  const t0 = Date.now();
  try {
    let r;
    switch (sc.kind) {
      case 'jsonld':
        r = await F.scrapeJsonLd(sc.url, sc.host || new URL(sc.url).hostname, sc.brand);
        break;
      case 'search':
        r = await F.scrapeSearchThenJsonLd(
          sc.url,
          query,
          sc.host || new URL(sc.url).hostname,
          sc.brand,
          sc.productUrlRe ? new RegExp(sc.productUrlRe, 'i') : null,
        );
        break;
      case 'mc':
        r = await F.scrapeMicroCenter(query);
        break;
      case 'shopify':
        r = await F.scrapeShopify(sc.store, sc.handle);
        break;
      case 'apple':
        r = await F.scrapeApple(sc.url);
        break;
      default:
        return { ok: false, skipped: true, note: `unknown kind ${sc.kind}` };
    }

    if (!r.ok) return { ...r, ms: Date.now() - t0 };

    // currency: sites may answer in a different currency than the offer charges in
    let price = r.price;
    if (r.currency && r.currency !== offer.currency && FX_RATES[r.currency] && FX_RATES[offer.currency]) {
      price = convert(price, r.currency, offer.currency);
    }

    // sanity: a matched product should not be wildly off from the known list price
    const list = offer.price || (offer.oldPrice ?? 0);
    if (list > 0 && (price > list * 2.2 || price < list * 0.45)) {
      return { ok: false, note: `price sanity check failed ($${price.toFixed(0)} vs known ~$${list})`, ms: Date.now() - t0 };
    }

    // discount: if the site exposes a list price use it, otherwise compare with our known list price
    let oldPrice = r.oldPrice ?? null;
    if (!oldPrice && list > 0 && price < list * 0.995) oldPrice = Math.round(list);
    if (oldPrice && oldPrice <= price) oldPrice = null;

    return { ok: true, price: Math.round(price * 100) / 100, oldPrice, inStock: r.inStock !== false, url: r.url || offer.url, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, note: String(e.message || e), ms: Date.now() - t0 };
  }
}

/** Scrape every offer with bounded concurrency. Returns { [offerId]: result }. */
export async function scrapeAll(laptops, { concurrency = 4, log = () => {} } = {}) {
  const offers = laptops.flatMap((l) => l.offers.map((o) => ({ laptop: l, offer: o })));
  const results = {};
  let i = 0;
  const worker = async () => {
    while (i < offers.length) {
      const idx = i++;
      const { laptop, offer } = offers[idx];
      const r = await scrapeOffer(offer, laptop);
      results[offer.id] = r;
      log(offer.id, offer.site, r.ok ? `OK $${r.price}` : r.skipped ? 'skip' : `fail: ${r.note}`);
    }
  };
  await Promise.all([...Array(Math.min(concurrency, offers.length))].map(worker));
  return results;
}

/** Site-level summary for /api/health. */
export function siteSummary(laptops, results) {
  const bySite = {};
  for (const l of laptops)
    for (const o of l.offers) {
      const s = (bySite[o.site] ??= { scraped: 0, ok: 0, lastOkAt: null });
      const r = results[o.id];
      if (!r || r.skipped) continue;
      s.scraped += 1;
      if (r.ok) {
        s.ok += 1;
        s.lastOkAt = new Date().toISOString();
      }
    }
  return bySite;
}
