/**
 * Laptop Finder — monitor server
 * ------------------------------
 * Runs the price-monitoring engine and streams live price events to the UI
 * over Server-Sent Events (the browser stays connected 24/7).
 *
 * The monitor keeps a copy of the catalog in memory and applies realistic
 * price events (discounts starting/ending, price drops/rises) exactly the way
 * a real 24/7 scraper of the tracked websites would. To go fully live, point
 * `scanOnce()` at real page fetches (Playwright) for each entry in
 * TRACKED_SITES — the event contract (see /api/events) stays identical.
 *
 * Only proper retailers & manufacturer stores are tracked (TRACKED_SITES
 * allow-list). eBay / AliExpress / Alibaba / Temu / private marketplaces are
 * deliberately excluded.
 */
import express from 'express';
import cors from 'cors';
import { CATALOG } from '../src/data/catalog.mjs';
import { TRACKED_SITES, COUNTRY_BY_CODE, CURRENCY_SYMBOL } from '../src/data/config.mjs';

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

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    laptops: laptops.length,
    offers: offerIndex.size,
    trackedSites: TRACKED_SITES.length,
    eventsEmitted: eventCount,
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[monitor] laptop-finder monitor server on :${PORT} — tracking ${offerIndex.size} offers across ${TRACKED_SITES.length} sites`);
  scheduleNext();
});
