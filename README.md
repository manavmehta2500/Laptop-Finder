# Laptop Finder

A clean, fully animated laptop deals finder with **live 24/7 price monitoring**, **country-aware pricing** (currency conversion + exact import VAT), and the deepest spec filter panel on the web.

> Laptops only for now — the data layer is structured so keyboards, mice & more can be added later as new "categories".

## Quick start

```bash
npm install
npm run dev
```

Opens the app on **http://localhost:5173** and starts the price-monitor API on **:3001** (the UI connects to it automatically via the Vite proxy — no configuration needed).

| Script | What it does |
| --- | --- |
| `npm run dev` | Web (Vite, :5173) + monitor API (Express, :3001) together |
| `npm run dev:api` | Monitor API only |
| `npm run dev:web` | Web only |
| `npm run build` | Type-check + production build |

## Go live in 3 steps (free, 24/7, no card)

The monitor runs as a **GitHub Actions cron job every 10 minutes** — free, always on, no server to babysit. It scrapes all tracked websites from GitHub's runners, commits the price snapshot, and GitHub Pages redeploys the site automatically.

1. **Merge this branch** into `main` (or work on it directly).
2. **Add the workflow file** `.github/workflows/laptop-finder.yml` on `main` (the Arena GitHub integration is not allowed to push workflow files — paste it from this repo's branch or the content below).
3. **Enable Pages**: repo → *Settings → Pages → Build and deploy → Source: GitHub Actions*.

That's it — within ~1 minute the first scrape runs and the site is live at
`https://<your-username>.github.io/Laptop-Finder/`.

Notes:
- Scheduled Actions jobs only run from the **default branch** — that's why the workflow must live on `main`.
- Sites that block datacenter IPs (Amazon, Best Buy, MediaMarkt, Bol…) degrade gracefully: their offers keep the last verified price and show an **unverified** badge. Manufacturer stores (Apple, Dell, HP, Razer, ASUS/ROG, Lenovo, Samsung, Framework/Shopify, Currys, Micro Center…) usually report live.
- `npm run dev` runs the same real scraper locally (SSE push). `MONITOR=sim npm run dev` gives the fast simulated feed for offline UI work.

## What you get

### Country & tax engine
- Pick your country on first load (re-pick anytime from the top-right globe). All offers are converted into that country's currency.
- Cross-border offers get the **exact import VAT/duty** for your destination added (e.g. US → Belgium adds 21% VAT; EU → EU adds nothing because VAT is already included). The card shows base price, tax line, and **total — the number you actually pay**.
- Budget slider, totals and sorting all operate on the tax-inclusive total in your currency.
- A "Duty-free to {country}" toggle hides any offer that would incur import tax.

### The live monitor (24/7, real scraping)
- **Production**: `scripts/cron-scrape.mjs` runs on GitHub Actions every 10 min — it scrapes every offer (JSON-LD product pages, search-page + matcher for the rest, Shopify for Framework, Micro Center's rendered search) and commits `public/data/prices.json`. The Pages site polls that file every 60s, so the deployed site updates live with flash animations + toasts.
- **Local dev**: `server/index.mjs` runs the same scraper on an interval (default 10 min, `SCRAPE_INTERVAL_MS` to tune) and pushes changes over SSE. `MONITOR=sim` switches to a fast simulated feed for offline work.
- The **"AI" step** is `server/scrape/matcher.mjs` — a deterministic, model-code-aware scorer that picks the exact product from a page of candidates (no API keys needed; swap in an LLM later if you want semantic matching).
- Only **proper retailers & manufacturer stores** are on the allow-list (MediaMarkt, Coolblue, Alternate, Micro Center, Best Buy, B&H, Currys, Scan, LDLC, Fnac, Bol, Notebooksbilliger, Amazon, Apple, Lenovo, ASUS/ROG, Dell, HP, MSI, Razer, Framework, Acer, Samsung, Microsoft…). **No eBay, AliExpress, Alibaba, Temu or private marketplaces.**
- Every offer links out to the exact retailer page for that model.
- Graceful degradation: a blocked site never breaks a run — its offers keep the last verified price and show an **unverified** badge until the next successful scrape.

### The filter panel
Every dimension, with live per-option result counts (unavailable options gray out and sink to the bottom):

- **Budget** — drag or type min/max, in your currency, tax included
- **Use** — gaming / work / student / ultrabook / creator / business
- **Deals & rules** — min/max discount slider, "discounts only", "duty-free to my country"
- **GPU** — vendor (NVIDIA/AMD/Intel/Apple/Qualcomm), min VRAM (4/6/8/12/16GB+), full GPU list with search + *see more*. **Integrated GPUs only match laptops where they ARE the main GPU** — a gaming laptop's iGPU never pollutes the list.
- **CPU** — vendor, min cores (4/6/8/10/12/16/20+), full CPU list with search + *see more*
- **Memory & storage** — DDR4/DDR5/LPDDR4x/LPDDR5/LPDDR5x/Unified, min RAM (8/16/32/64GB+), exact config (1x8, 2x8, 1x16, 2x16, 1x32, 2x32…), speed in MT/s **scoped to the type you picked**, "upgradeable RAM only" toggle (off by default = show everything), min storage (256GB/512GB/1TB/2TB+)
- **Display** — resolution (FHD → 4K), refresh-rate slider (60–240Hz), panel (IPS/OLED/Tandem OLED/Mini-LED), aspect ratio, touch any/yes/no, screen-size slider in inches
- **Brand & family** — search all brands; click a brand to select the whole family or expand it to pick a line (Legion vs LOQ, ROG Strix vs Zephyrus…), with *see more*
- **System & layout** — OS, keyboard layout (QWERTY US/UK, QWERTZ DE, AZERTY FR/BE, BEPO), Wi-Fi minimum (5/6/6E/7)
- **Ships from & currency** — origin country and offer currency filters

### Everything else
- Discount shows as strikethrough old price → new price + red % badge; "In stock" dot on every offer
- Sort: price ↑↓, biggest discount, top rated, newest
- Animated window entrance, staggered cards, layout-animated re-sorting, spring accordions, drag+type sliders, toasts, skeleton loading
- Mobile: filters slide in as a drawer

## Architecture

```
.github/workflows/      24/7 cron: scrape → commit → build → Pages deploy
scripts/cron-scrape.mjs the monitor job (runs on GitHub Actions)
server/index.mjs        dev server: Express + SSE + live scrape engine
server/scraper.mjs      scrape dispatcher + price sanity checks + site stats
server/scrape/          fetchers (JSON-LD, search, Shopify, Micro Center, Apple) + matcher
src/data/catalog.mjs    40 laptops · 80 offers (each with a scrape strategy) — shared by server, UI, cron
src/data/config.mjs     countries, FX rates, import-tax table, tracked-site allow-list
src/lib/filter.ts       matching engine, faceted counts, price/tax math, slider domains
src/lib/types.ts        shared TypeScript types
src/components/…        FilterPanel, LaptopCard, Header, CountryModal, Toasts, …
public/data/            generated: prices.json (live snapshot) + bootstrap.json
```

Country → import-rate logic lives in `importRateFor()`: same free-trade region (EU single market, etc.) = 0% extra; otherwise the destination's VAT/duty applies. FX rates are a static snapshot in `FX_RATES` (swap for a live FX feed in production).

## Adding keyboards, mice & more later

1. Add a `category` field (or a new root `ProductCategory`) in `src/lib/types.ts`
2. Extend `src/data/catalog.mjs` with the new items (same offer shape)
3. Add top-level category tabs in `App.tsx` — the filter engine, monitor, tax and UI all reuse the same structures
