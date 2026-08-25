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

## Go live — two free 24/7 options

### Option A — free always-on VM (BEST coverage: real browser + 5-min updates)
Oracle Cloud **Always Free** VM (or GCP e2-micro) — $0, needs a card for identity verification, never charged. One command:

```bash
# on the VM (Ubuntu):
bash scripts/deploy-vm.sh
```

It installs Node 22 + Chromium, builds the site, and starts a systemd service that serves the app **and** runs the live monitor (scrapes every 5 min, `PLAYWRIGHT=1` real-browser fallback for bot-protected sites). Live at `http://<vm-ip>:8080`.

### Option B — GitHub Actions cron (no card, zero setup)
A cron job every 10 minutes scrapes from GitHub's runners, commits the price snapshot, and GitHub Pages redeploys:

1. **Merge this branch** into `main`.
2. **Add `.github/workflows/laptop-finder.yml`** on `main` (the Arena GitHub integration can't push workflow files — see chat for the content).
3. **Settings → Pages → Source: GitHub Actions.**

Live at `https://<your-username>.github.io/Laptop-Finder/`. Scheduled jobs only run from the default branch.

### Optional accuracy upgrades (free)
- **Best Buy API key** (minutes, free at bestbuyopenapi.com) → set `BESTBUY_CLIENT_ID`: exact price, sale price, stock and canonical URL for all Best Buy offers, plus Best Buy catalog discovery.
- `MONITOR=sim npm run dev` → fast simulated feed for offline UI work.

## What you get

### Country & tax engine
- Pick your country on first load (re-pick anytime from the top-right globe). All offers are converted into that country's currency.
- Cross-border offers get the **exact import VAT/duty** for your destination added (e.g. US → Belgium adds 21% VAT; EU → EU adds nothing because VAT is already included). The card shows base price, tax line, and **total — the number you actually pay**.
- Budget slider, totals and sorting all operate on the tax-inclusive total in your currency.
- A "Duty-free to {country}" toggle hides any offer that would incur import tax.

### The live monitor (24/7, real scraping)
- **Production**: `scripts/cron-scrape.mjs` (GitHub Actions every 10 min) or the same engine inside the VM's systemd service (every 5 min). Each cycle:
  1. **scrape** every offer — JSON-LD product pages, search-page + matcher, Shopify, Micro Center rendered search, Best Buy official API (with a free key), and a **real Chromium browser fallback** (`PLAYWRIGHT=1`) for sites that bot-block plain requests
  2. **verify a rotating sample of links** — the page must load and actually contain the laptop it claims to be (`linkOk`)
  3. **discover** laptops we don't track yet (brand listing pages + Best Buy API) → `public/data/discovered.json`
  4. commit `public/data/prices.json` → the deployed site updates live (flash + toast on the browser)
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
server/scrape/          fetchers (JSON-LD, search, Shopify, Micro Center, Apple, Best Buy API)
                        + browser fallback (Playwright) + matcher + link verification + discovery
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
