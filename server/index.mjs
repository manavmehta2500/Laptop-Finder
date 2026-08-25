/**
 * Laptop Finder — monitor server
 * ------------------------------
 * Runs the price-monitoring engine and streams live price events to the UI
 * over Server-Sent Events (the browser stays connected 24/7).
 *
 * The monitor keeps a copy of the catalog in memory and, by default
 * (MONITOR=live), runs the REAL scraper (server/scraper.mjs) over every
 * tracked offer every SCRAPE_INTERVAL_MS (default 10 min), broadcasting
 * price/discount changes over SSE. In production the same scrape runs as a
 * 24/7 GitHub Actions cron job (scripts/cron-scrape.mjs) and the deployed
 * Pages site simply polls the generated public/data/prices.json.
 * Set MONITOR=sim to get a fast simulated feed instead (offline dev).
 *
 * Only proper retailers & manufacturer stores are tracked (TRACKED_SITES
 * allow-list). eBay / AliExpress / Alibaba / Temu / private marketplaces are
 * deliberately excluded.
 */
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../src/data/catalog.mjs';
import { TRACKED_SITES, COUNTRY_BY_CODE, CURRENCY_SYMBOL } from '../src/data/config.mjs';
import { scrapeAll, siteSummary } from './scraper.mjs';

const PORT = process.env.PORT || 3001;
const app = express();
app.use(cors());
app.use(express.json());

// ── In-memory catalog (the monitor mutates this) ─────────────────────────────
const laptops = JSON.parse(JSON.stringify(CATALOG));
const offerIndex = new Map(); // offerId -> { laptop, offer }
for (const l of laptops) for (const o of l.offers) offerIndex.set(o.id, { laptop: l, offer: o });

const startedAt = Date.now();
let eventCount = 0;

// ── SSE hub ──────────────────────────────────────────────────────────────────
const clients = new Set();
function broadcast(payload) {
  const frame = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try {
      res.write(frame);
    } catch {
      clients.delete(res);
    }
  }
}

// ── The monitor ──────────────────────────────────────────────────────────────
const round5 = (n) => Math.max(49, Math.round(n / 5) * 5);
const sym = (c) => CURRENCY_SYMBOL[c] ?? `${c} `;

function describeEvent(type, offer, laptop) {
  const flag = COUNTRY_BY_CODE[offer.origin]?.flag ?? '';
  const where = `${offer.site} ${flag}`.trim();
  const priceTxt = `${sym(offer.currency)}${Math.round(offer.price).toLocaleString('en')}`;
  const pct = offer.oldPrice ? Math.round((1 - offer.price / offer.oldPrice) * 100) : 0;
  switch (type) {
    case 'discount-start':
      return `${laptop.name} went on sale at ${where} — ${priceTxt} (−${pct}%)`;
    case 'discount-end':
      return `${laptop.name} sale ended at ${where} — back to full price ${priceTxt}`;
    case 'price-drop':
      return `${laptop.name} dropped to ${priceTxt} at ${where}`;
    case 'price-rise':
      return `${laptop.name} is now ${priceTxt} at ${where}`;
    default:
      return '';
  }
}

function monitorTick() {
  const events = [];
  const howMany = 1 + Math.floor(Math.random() * 3);
  const entries = [...offerIndex.values()];
  for (let i = 0; i < howMany; i++) {
    const { laptop, offer } = entries[Math.floor(Math.random() * entries.length)];
    const roll = Math.random();
    let type;
    if (offer.oldPrice != null && roll < 0.28) {
      // the deal ended — discount removed
      offer.oldPrice = null;
      type = 'discount-end';
    } else if (offer.oldPrice == null && roll < 0.5) {
      // a new discount just started
      const depth = 0.1 + Math.random() * 0.16;
      offer.oldPrice = round5(offer.price / (1 - depth));
      type = 'discount-start';
    } else if (roll < 0.82) {
      // price drop
      const pct = 0.01 + Math.random() * 0.045;
      const prev = offer.price;
      offer.price = round5(offer.price * (1 - pct));
      if (offer.oldPrice != null) offer.oldPrice = Math.max(offer.oldPrice, offer.price + 40);
      if (offer.price >= prev) offer.price = Math.max(49, prev - 5);
      type = 'price-drop';
    } else {
      // small price rise
      const pct = 0.005 + Math.random() * 0.02;
      offer.price = round5(offer.price * (1 + pct));
      if (offer.oldPrice != null) offer.oldPrice = Math.max(offer.oldPrice, offer.price + 40);
      type = 'price-rise';
    }
    offer.updatedAt = Date.now();
    eventCount += 1;
    events.push({
      type,
      offerId: offer.id,
      laptopId: laptop.id,
      site: offer.site,
      laptopName: laptop.name,
      price: offer.price,
      oldPrice: offer.oldPrice,
      currency: offer.currency,
      message: describeEvent(type, offer, laptop),
      ts: Date.now(),
    });
  }
  broadcast({ type: 'prices', events });
  scheduleNext();
}

function scheduleNext() {
  setTimeout(monitorTick, 5000 + Math.random() * 9000);
}

/* ── live scraping engine ─────────────────────────────────────────────────── */
const SCRAPE_INTERVAL_MS = Number(process.env.SCRAPE_INTERVAL_MS || 10 * 60 * 1000);

async function runLiveScrape() {
  console.log(`[monitor] live scrape started (${offerIndex.size} offers)…`);
  const results = await scrapeAll(laptops, { log: (id, site, what) => console.log(`[monitor] ${site.padEnd(16)} ${what}`) });
  siteStats = siteSummary(laptops, results);
  const events = [];
  for (const { laptop, offer } of offerIndex.values()) {
    const r = results[offer.id];
    if (!r || !r.ok) continue;
    if (r.price === offer.price && r.oldPrice === offer.oldPrice) continue;
    let type = 'price-drop';
    if (r.oldPrice != null && offer.oldPrice == null) type = 'discount-start';
    else if (r.oldPrice == null && offer.oldPrice != null) type = 'discount-end';
    else if (r.price < offer.price) type = 'price-drop';
    else type = 'price-rise';
    offer.price = r.price;
    offer.oldPrice = r.oldPrice;
    offer.inStock = r.inStock !== false;
    offer.updatedAt = Date.now();
    eventCount += 1;
    events.push({
      type,
      offerId: offer.id,
      laptopId: laptop.id,
      site: offer.site,
      laptopName: laptop.name,
      price: offer.price,
      oldPrice: offer.oldPrice,
      currency: offer.currency,
      message: describeEvent(type, offer, laptop),
      ts: Date.now(),
    });
  }
  lastScrapeAt = new Date().toISOString();
  if (events.length) broadcast({ type: 'prices', events });
  const ok = Object.values(siteStats).reduce((a, s) => a + s.ok, 0);
  console.log(`[monitor] live scrape done — ${ok} offers verified live`);
  scheduleNextLive();
}

function scheduleNextLive() {
  setTimeout(() => runLiveScrape().catch((e) => { console.error('[monitor] scrape error:', e.message); scheduleNextLive(); }), SCRAPE_INTERVAL_MS);
}

// ── Routes ───────────────────────────────────────────────────────────────────
let lastScrapeAt = null;
let siteStats = {};
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: MODE,
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    laptops: laptops.length,
    offers: offerIndex.size,
    trackedSites: TRACKED_SITES.length,
    eventsEmitted: eventCount,
    lastScrapeAt,
    sites: siteStats,
  });
});

app.get('/api/bootstrap', (_req, res) => {
  res.json({
    laptops,
    sites: TRACKED_SITES,
    countries: COUNTRY_BY_CODE,
  });
});

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');
  res.write(`data: ${JSON.stringify({ type: 'hello', ts: Date.now(), events: eventCount })}\n\n`);
  clients.add(res);
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 20000);
  req.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(res);
  });
});

const MODE = process.env.MONITOR || 'live';

// On a deployed VM, serve the built site from this same process (single port)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  console.log('[monitor] serving built site from dist/ (single-port deploy)');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[monitor] laptop-finder monitor server on :${PORT} — tracking ${offerIndex.size} offers across ${TRACKED_SITES.length} sites (mode: ${MODE})`);
  if (MODE === 'sim') scheduleNext();
  else runLiveScrape().catch((e) => { console.error('[monitor] scrape error:', e.message); scheduleNextLive(); });
});
