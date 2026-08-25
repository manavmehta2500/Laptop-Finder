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

## What you get

### Country & tax engine
- Pick your country on first load (re-pick anytime from the top-right globe). All offers are converted into that country's currency.
- Cross-border offers get the **exact import VAT/duty** for your destination added (e.g. US → Belgium adds 21% VAT; EU → EU adds nothing because VAT is already included). The card shows base price, tax line, and **total — the number you actually pay**.
- Budget slider, totals and sorting all operate on the tax-inclusive total in your currency.
- A "Duty-free to {country}" toggle hides any offer that would incur import tax.

### The live monitor (24/7)
- A background process (`server/index.mjs`) keeps price state for every tracked offer and streams changes over **SSE** — cards flash green/red, the header badge counts updates, and toasts announce every deal start/end and price move in real time.
- Only **proper retailers & manufacturer stores** are on the allow-list (MediaMarkt, Coolblue, Alternate, Micro Center, Best Buy, B&H, Currys, Scan, LDLC, Fnac, Bol, Notebooksbilliger, Amazon, Apple, Lenovo, ASUS/ROG, Dell, HP, MSI, Razer, Framework, Acer, Samsung, Microsoft…). **No eBay, AliExpress, Alibaba, Temu or private marketplaces.**
- Each offer links out to the exact retailer page for that model.
- ⚠️ In this repo the monitor runs a **simulation engine** that applies realistic price/discount events (swap `monitorTick()` for Playwright scrapers per `TRACKED_SITES` to go fully live — the event contract stays identical). Prices/links/images are a realistic seed snapshot, not a live crawl.

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
server/index.mjs        Express + SSE + monitor engine (in-memory price state)
src/data/catalog.mjs    40 laptops · 80 offers — single source of truth (shared by server & UI)
src/data/config.mjs     countries, FX rates, import-tax table, tracked-site allow-list
src/lib/filter.ts       matching engine, faceted counts, price/tax math, slider domains
src/lib/types.ts        shared TypeScript types
src/components/…        FilterPanel, LaptopCard, Header, CountryModal, Toasts, …
```

Country → import-rate logic lives in `importRateFor()`: same free-trade region (EU single market, etc.) = 0% extra; otherwise the destination's VAT/duty applies. FX rates are a static snapshot in `FX_RATES` (swap for a live FX feed in production).

## Adding keyboards, mice & more later

1. Add a `category` field (or a new root `ProductCategory`) in `src/lib/types.ts`
2. Extend `src/data/catalog.mjs` with the new items (same offer shape)
3. Add top-level category tabs in `App.tsx` — the filter engine, monitor, tax and UI all reuse the same structures
