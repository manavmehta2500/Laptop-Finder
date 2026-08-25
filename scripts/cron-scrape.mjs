#!/usr/bin/env node
/**
 * 24/7 monitor job (runs on GitHub Actions every 10 minutes).
 *
 * 1. Scrape every offer from its website.
 * 2. Merge with the last known good prices (failures keep the previous price
 *    and are marked `verified: false` so the UI can show "unverified").
 * 3. Write public/data/prices.json + public/data/bootstrap.json.
 * 4. The commit triggers the Pages build & deploy — the site updates live.
 *
 * Exit code is always 0 unless the scrape itself is broken (a failed SITE
 * never fails the run — that's by design).
 */
import fs from 'node:fs';
import path from 'node:path';
import { CATALOG } from '../src/data/catalog.mjs';
import { COUNTRIES, TRACKED_SITES } from '../src/data/config.mjs';
import { scrapeAll, siteSummary } from '../server/scraper.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dataDir = path.join(root, 'public', 'data');
const pricesPath = path.join(dataDir, 'prices.json');

const started = Date.now();
console.log(`[cron] starting scrape of ${CATALOG.reduce((a, l) => a + l.offers.length, 0)} offers…`);

const prev = fs.existsSync(pricesPath) ? JSON.parse(fs.readFileSync(pricesPath, 'utf8')) : null;
const prevOffers = prev?.offers ?? {};

const results = await scrapeAll(CATALOG, {
  concurrency: 4,
  log: (id, site, what) => console.log(`[cron] ${site.padEnd(16)} ${what}`),
});

const now = Date.now();
const offers = {};
let live = 0;
let kept = 0;
for (const l of CATALOG) {
  for (const o of l.offers) {
    const r = results[o.id];
    const p = prevOffers[o.id] ?? {};
    if (r && r.ok) {
      offers[o.id] = {
        price: r.price,
        oldPrice: r.oldPrice ?? null,
        updatedAt: now,
        verified: true,
        verifiedAt: now,
        source: 'live',
      };
      live += 1;
    } else {
      offers[o.id] = {
        price: p.price ?? o.price,
        oldPrice: p.oldPrice ?? o.oldPrice,
        updatedAt: now,
        verified: false,
        verifiedAt: p.verifiedAt ?? null,
        source: 'seed',
        lastNote: r?.note ?? 'no result',
      };
      kept += 1;
    }
  }
}

const prices = {
  generatedAt: new Date(now).toISOString(),
  generator: 'laptop-finder monitor (github actions cron)',
  durationMs: Date.now() - started,
  liveCount: live,
  keptCount: kept,
  sites: siteSummary(CATALOG, results),
  offers,
};

fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(pricesPath, JSON.stringify(prices, null, 2));

// bootstrap.json = static catalog + config, so the Pages deploy is self-contained
const bootstrap = { laptops: CATALOG, sites: TRACKED_SITES, countries: COUNTRIES };
fs.writeFileSync(path.join(dataDir, 'bootstrap.json'), JSON.stringify(bootstrap));

const okSites = Object.entries(prices.sites).filter(([, s]) => s.ok > 0).map(([n]) => n);
console.log(`[cron] done in ${((Date.now() - started) / 1000).toFixed(1)}s — live: ${live}, kept previous: ${kept}`);
console.log(`[cron] sites reporting live prices: ${okSites.join(', ') || '(none this run)'}`);
