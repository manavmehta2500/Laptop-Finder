import { CATALOG } from './catalog';
import { FX_RATES, importRateFor, COUNTRY_BY_CODE } from './config';
import type { Laptop, Offer, UseCase, GpuVendor, CpuVendor, RamType, GpuSpec } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Filter state
// ─────────────────────────────────────────────────────────────────────────────

export type SortKey = 'total-asc' | 'total-desc' | 'discount-desc' | 'rating-desc' | 'newest';

export interface Filters {
  search: string;
  budget: [number, number] | null; // in destination currency, applies to final total (price + import tax)
  use: UseCase[];
  gpuVendors: GpuVendor[];
  minVram: number | null;
  gpus: string[]; // primary-GPU keys
  cpuVendors: CpuVendor[];
  minCores: number | null;
  cpus: string[]; // cpu name keys
  ramTypes: RamType[];
  minRam: number | null;
  ramConfigs: string[];
  ramSpeeds: number[];
  upgradeableOnly: boolean;
  minStorage: number | null;
  discountRange: [number, number]; // percent
  discountOnly: boolean;
  dutyFreeOnly: boolean;
  resolutions: string[];
  refresh: [number, number];
  panels: string[];
  aspects: string[];
  touch: 'any' | 'yes' | 'no';
  screenSize: [number, number];
  brands: string[]; // brand keys; empty = all
  lines: string[]; // specific lines within selected brands
  origins: string[];
  currencies: string[];
  oses: string[];
  layouts: string[];
  minWifi: number | null; // 5 | 6 | 6E | 7
  sort: SortKey;
}

export const WIFI_RANK: Record<string, number> = { 'Wi-Fi 5': 1, 'Wi-Fi 6': 2, 'Wi-Fi 6E': 3, 'Wi-Fi 7': 4 };

export const DEFAULT_FILTERS: Filters = {
  search: '',
  budget: null,
  use: [],
  gpuVendors: [],
  minVram: null,
  gpus: [],
  cpuVendors: [],
  minCores: null,
  cpus: [],
  ramTypes: [],
  minRam: null,
  ramConfigs: [],
  ramSpeeds: [],
  upgradeableOnly: false,
  minStorage: null,
  discountRange: [0, 40],
  discountOnly: false,
  dutyFreeOnly: false,
  resolutions: [],
  refresh: [60, 240],
  panels: [],
  aspects: [],
  touch: 'any',
  screenSize: [13, 17],
  brands: [],
  lines: [],
  origins: [],
  currencies: [],
  oses: [],
  layouts: [],
  minWifi: null,
  sort: 'total-asc',
};

// ─────────────────────────────────────────────────────────────────────────────
// Derived values
// ─────────────────────────────────────────────────────────────────────────────

export function primaryGpu(l: Laptop): GpuSpec {
  return l.gpu ?? l.igpu!;
}

export function gpuKey(g: GpuSpec): string {
  return g.name;
}

export function discountPct(offer: Offer): number {
  if (!offer.oldPrice || offer.oldPrice <= 0) return 0;
  return Math.round((1 - offer.price / offer.oldPrice) * 100);
}

export function convert(price: number, from: string, destCurrency: string): number {
  // FX_RATES expresses 1 USD in each currency, so:
  // amount in `from` -> USD -> `destCurrency`
  return (price * FX_RATES[destCurrency]) / FX_RATES[from];
}

export interface OfferPriced {
  offer: Offer;
  baseUser: number; // current price in destination currency
  oldUser: number | null; // pre-discount price in destination currency
  taxUser: number; // import tax in destination currency
  total: number; // baseUser + taxUser
  discount: number; // percent
}

export function priceOffer(offer: Offer, dest: string): OfferPriced {
  const destCurrency = COUNTRY_BY_CODE[dest].currency;
  const baseUser = convert(offer.price, offer.currency, destCurrency);
  const oldUser = offer.oldPrice != null ? convert(offer.oldPrice, offer.currency, destCurrency) : null;
  const rate = importRateFor(offer.origin, dest);
  const taxUser = baseUser * rate;
  return {
    offer,
    baseUser,
    oldUser,
    taxUser,
    total: baseUser + taxUser,
    discount: discountPct(offer),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Matching
// ─────────────────────────────────────────────────────────────────────────────

function matchesLaptop(l: Laptop, f: Filters, dest: string): OfferPriced[] {
  // laptop-level spec filters
  if (f.use.length && !f.use.includes(l.category)) return [];
  if (f.oses.length && !f.oses.includes(l.os)) return [];
  if (f.layouts.length && !f.layouts.some((x) => l.layouts.includes(x))) return [];
  if (f.minWifi != null && (WIFI_RANK[l.wifi] ?? 0) < f.minWifi) return [];

  const pg = primaryGpu(l);
  if (f.gpuVendors.length && !f.gpuVendors.includes(pg.vendor)) return [];
  if (f.minVram != null && (pg.vramGB ?? 0) < f.minVram) return [];
  if (f.gpus.length && !f.gpus.includes(gpuKey(pg))) return [];

  if (f.cpuVendors.length && !f.cpuVendors.includes(l.cpu.vendor)) return [];
  if (f.minCores != null && l.cpu.cores < f.minCores) return [];
  if (f.cpus.length && !f.cpus.includes(l.cpu.name)) return [];

  if (f.ramTypes.length && !f.ramTypes.includes(l.ram.type)) return [];
  if (f.minRam != null && l.ram.sizeGB < f.minRam) return [];
  if (f.ramConfigs.length && !f.ramConfigs.includes(l.ram.config)) return [];
  if (f.ramSpeeds.length && (l.ram.speedMTs == null || !f.ramSpeeds.includes(l.ram.speedMTs))) return [];
  if (f.upgradeableOnly && !l.ram.upgradeable) return [];
  if (f.minStorage != null && l.storage.sizeGB < f.minStorage) return [];

  const d = l.display;
  if (f.resolutions.length && !f.resolutions.includes(d.resLabel)) return [];
  if (f.refresh && (d.refreshHz < f.refresh[0] || d.refreshHz > f.refresh[1])) return [];
  if (f.panels.length && !f.panels.includes(d.panel)) return [];
  if (f.aspects.length && !f.aspects.includes(d.aspect)) return [];
  if (f.touch === 'yes' && !d.touch) return [];
  if (f.touch === 'no' && d.touch) return [];
  if (f.screenSize && (d.sizeInches < f.screenSize[0] || d.sizeInches > f.screenSize[1])) return [];

  if (f.brands.length && !f.brands.includes(l.brand)) return [];
  if (f.brands.length && f.lines.length && !f.lines.includes(l.line)) return [];
  // If only lines are selected (no brand), a laptop matches when its line is selected.
  if (!f.brands.length && f.lines.length && !f.lines.includes(l.line)) return [];

  const q = f.search.trim().toLowerCase();
  if (q) {
    const hay = `${l.brand} ${l.line} ${l.name} ${l.cpu.name} ${pg.name} ${l.ram.type} ${l.os}`.toLowerCase();
    const words = q.split(/\s+/);
    if (!words.every((w) => hay.includes(w))) return [];
  }

  // offer-level filters: keep offers that pass
  const priced: OfferPriced[] = [];
  for (const o of l.offers) {
    if (f.origins.length && !f.origins.includes(o.origin)) continue;
    if (f.currencies.length && !f.currencies.includes(o.currency)) continue;
    const p = priceOffer(o, dest);
    if (f.discountOnly && p.discount <= 0) continue;
    if (f.discountRange && (p.discount < f.discountRange[0] || p.discount > f.discountRange[1])) continue;
    if (f.dutyFreeOnly && p.taxUser > 0.005) continue;
    if (f.budget && (p.total < f.budget[0] || p.total > f.budget[1])) continue;
    priced.push(p);
  }
  return priced;
}

export interface MatchResult {
  laptop: Laptop;
  offers: OfferPriced[];
  bestTotal: number;
  bestDiscount: number;
}

export function runFilters(f: Filters, dest: string, catalog: Laptop[] = CATALOG): MatchResult[] {
  const out: MatchResult[] = [];
  for (const l of catalog) {
    const offers = matchesLaptop(l, f, dest);
    if (!offers.length) continue;
    offers.sort((a, b) => a.total - b.total);
    out.push({
      laptop: l,
      offers,
      bestTotal: offers[0].total,
      bestDiscount: Math.max(...offers.map((o) => o.discount)),
    });
  }
  switch (f.sort) {
    case 'total-asc':
      out.sort((a, b) => a.bestTotal - b.bestTotal);
      break;
    case 'total-desc':
      out.sort((a, b) => b.bestTotal - a.bestTotal);
      break;
    case 'discount-desc':
      out.sort((a, b) => b.bestDiscount - a.bestDiscount || a.bestTotal - b.bestTotal);
      break;
    case 'rating-desc':
      out.sort((a, b) => b.laptop.rating - a.laptop.rating || a.bestTotal - b.bestTotal);
      break;
    case 'newest':
      out.sort((a, b) => b.laptop.year - a.laptop.year || a.bestTotal - b.bestTotal);
      break;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Faceted option counts (available options on top, unavailable grayed at bottom)
// ─────────────────────────────────────────────────────────────────────────────

export interface FacetOption<T = unknown> {
  key: string;
  label: string;
  sub?: string;
  count: number; // laptops that would match if this option were (also) selected
  active: boolean;
  payload: T;
}

type Facet =
  | { kind: 'use'; value: UseCase }
  | { kind: 'gpuVendor'; value: GpuVendor }
  | { kind: 'minVram'; value: number }
  | { kind: 'gpu'; value: string }
  | { kind: 'cpuVendor'; value: CpuVendor }
  | { kind: 'minCores'; value: number }
  | { kind: 'cpu'; value: string }
  | { kind: 'ramType'; value: RamType }
  | { kind: 'minRam'; value: number }
  | { kind: 'ramConfig'; value: string }
  | { kind: 'ramSpeed'; value: number }
  | { kind: 'minStorage'; value: number }
  | { kind: 'resolution'; value: string }
  | { kind: 'panel'; value: string }
  | { kind: 'aspect'; value: string }
  | { kind: 'brand'; value: string }
  | { kind: 'line'; value: string }
  | { kind: 'origin'; value: string }
  | { kind: 'currency'; value: string }
  | { kind: 'os'; value: string }
  | { kind: 'layout'; value: string }
  | { kind: 'minWifi'; value: number };

function withFacet(f: Filters, facet: Facet): Filters {
  const clone: Filters = { ...f };
  switch (facet.kind) {
    case 'use': clone.use = Array.from(new Set([...f.use, facet.value])); break;
    case 'gpuVendor': clone.gpuVendors = Array.from(new Set([...f.gpuVendors, facet.value])); break;
    case 'minVram': clone.minVram = facet.value; break;
    case 'gpu': clone.gpus = Array.from(new Set([...f.gpus, facet.value])); break;
    case 'cpuVendor': clone.cpuVendors = Array.from(new Set([...f.cpuVendors, facet.value])); break;
    case 'minCores': clone.minCores = facet.value; break;
    case 'cpu': clone.cpus = Array.from(new Set([...f.cpus, facet.value])); break;
    case 'ramType': clone.ramTypes = Array.from(new Set([...f.ramTypes, facet.value])); break;
    case 'minRam': clone.minRam = facet.value; break;
    case 'ramConfig': clone.ramConfigs = Array.from(new Set([...f.ramConfigs, facet.value])); break;
    case 'ramSpeed': clone.ramSpeeds = Array.from(new Set([...f.ramSpeeds, facet.value])); break;
    case 'minStorage': clone.minStorage = facet.value; break;
    case 'resolution': clone.resolutions = Array.from(new Set([...f.resolutions, facet.value])); break;
    case 'panel': clone.panels = Array.from(new Set([...f.panels, facet.value])); break;
    case 'aspect': clone.aspects = Array.from(new Set([...f.aspects, facet.value])); break;
    case 'brand': clone.brands = Array.from(new Set([...f.brands, facet.value])); break;
    case 'line': clone.lines = Array.from(new Set([...f.lines, facet.value])); break;
    case 'origin': clone.origins = Array.from(new Set([...f.origins, facet.value])); break;
    case 'currency': clone.currencies = Array.from(new Set([...f.currencies, facet.value])); break;
    case 'os': clone.oses = Array.from(new Set([...f.oses, facet.value])); break;
    case 'layout': clone.layouts = Array.from(new Set([...f.layouts, facet.value])); break;
    case 'minWifi': clone.minWifi = facet.value; break;
  }
  return clone;
}

export function computeFacetCounts(f: Filters, dest: string, catalog: Laptop[] = CATALOG) {
  const count = (facet: Facet) => {
    const ff = withFacet(f, facet);
    return runFilters(ff, dest, catalog).length;
  };

  const useOptions: FacetOption<UseCase>[] = (['gaming', 'work', 'student', 'ultrabook', 'creator', 'business'] as UseCase[]).map(
    (v) => ({ key: `use-${v}`, label: v[0].toUpperCase() + v.slice(1), count: count({ kind: 'use', value: v }), active: f.use.includes(v), payload: v }),
  );

  const gpuVendorOptions: FacetOption<GpuVendor>[] = (['NVIDIA', 'AMD', 'Intel', 'Apple', 'Qualcomm'] as GpuVendor[]).map(
    (v) => ({ key: `gv-${v}`, label: v, count: count({ kind: 'gpuVendor', value: v }), active: f.gpuVendors.includes(v), payload: v }),
  );

  const minVramOptions: FacetOption<number>[] = [null, 4, 6, 8, 12, 16].map((v) => ({
    key: `vram-${v}`,
    label: v == null ? 'Any' : `${v}GB+`,
    count: v == null ? runFilters(f, dest, catalog).length : count({ kind: 'minVram', value: v }),
    active: f.minVram === v,
    payload: v as number,
  })) as FacetOption<number>[];

  // GPU list — primary GPUs only. A gaming laptop's iGPU never shows up here;
  // picking an iGPU (Radeon 780M, Apple M4…) only matches laptops where it IS the main GPU.
  const gpuMap = new Map<string, { spec: GpuSpec; laptops: number }>();
  for (const l of catalog) {
    const g = primaryGpu(l);
    const k = gpuKey(g);
    const e = gpuMap.get(k) ?? { spec: g, laptops: 0 };
    e.laptops += 1;
    gpuMap.set(k, e);
  }
  const gpuOrder: Record<string, number> = { NVIDIA: 0, AMD: 1, Intel: 2, Apple: 3, Qualcomm: 4 };
  const gpuEntries = [...gpuMap.entries()].sort((a, b) => {
    const va = a[1].spec.vramGB ?? 0;
    const vb = b[1].spec.vramGB ?? 0;
    if (gpuOrder[a[1].spec.vendor] !== gpuOrder[b[1].spec.vendor]) return gpuOrder[a[1].spec.vendor] - gpuOrder[b[1].spec.vendor];
    return vb - va;
  });
  const gpuOptions: FacetOption<string>[] = gpuEntries.map(([k, { spec }]) => ({
    key: `gpu-${k}`,
    label: spec.name,
    sub: spec.vramGB ? `${spec.vramGB} GB VRAM` : 'Integrated',
    count: count({ kind: 'gpu', value: k }),
    active: f.gpus.includes(k),
    payload: k,
  }));

  const cpuVendorOptions: FacetOption<CpuVendor>[] = (['Intel', 'AMD', 'Apple', 'Qualcomm'] as CpuVendor[]).map(
    (v) => ({ key: `cv-${v}`, label: v, count: count({ kind: 'cpuVendor', value: v }), active: f.cpuVendors.includes(v), payload: v }),
  );

  const minCoresOptions: FacetOption<number>[] = [null, 4, 6, 8, 10, 12, 16, 20].map((v) => ({
    key: `cores-${v}`,
    label: v == null ? 'Any' : `${v}+ cores`,
    count: v == null ? runFilters(f, dest, catalog).length : count({ kind: 'minCores', value: v }),
    active: f.minCores === v,
    payload: v as number,
  })) as FacetOption<number>[];

  const cpuMap = new Map<string, { spec: Laptop['cpu']; laptops: number }>();
  for (const l of catalog) {
    const k = l.cpu.name;
    const e = cpuMap.get(k) ?? { spec: l.cpu, laptops: 0 };
    e.laptops += 1;
    cpuMap.set(k, e);
  }
  const cpuEntries = [...cpuMap.entries()].sort((a, b) => b[1].spec.cores - a[1].spec.cores || a[0].localeCompare(b[0]));
  const cpuOptions: FacetOption<string>[] = cpuEntries.map(([k, { spec }]) => ({
    key: `cpu-${k}`,
    label: spec.name,
    sub: `${spec.cores} cores · ${spec.vendor}`,
    count: count({ kind: 'cpu', value: k }),
    active: f.cpus.includes(k),
    payload: k,
  }));

  const ramTypeOptions: FacetOption<RamType>[] = (['DDR4', 'DDR5', 'LPDDR4x', 'LPDDR5', 'LPDDR5x', 'Unified'] as RamType[]).map(
    (v) => ({ key: `rt-${v}`, label: v, count: count({ kind: 'ramType', value: v }), active: f.ramTypes.includes(v), payload: v }),
  );

  const minRamOptions: FacetOption<number>[] = [null, 8, 16, 32, 64].map((v) => ({
    key: `ram-${v}`,
    label: v == null ? 'Any' : `${v}GB+`,
    count: v == null ? runFilters(f, dest, catalog).length : count({ kind: 'minRam', value: v }),
    active: f.minRam === v,
    payload: v as number,
  })) as FacetOption<number>[];

  const configMap = new Map<string, number>();
  for (const l of catalog) configMap.set(l.ram.config, (configMap.get(l.ram.config) ?? 0) + 1);
  const configOrder = (c: string) => {
    const m = c.match(/^(\d)x(\d+)GB/);
    if (m) return parseInt(m[2]) * 1000 + parseInt(m[1]) * 10;
    const u = c.match(/^(\d+)GB/);
    return u ? parseInt(u[1]) + 500 : 9999;
  };
  const ramConfigOptions: FacetOption<string>[] = [...configMap.keys()]
    .sort((a, b) => configOrder(a) - configOrder(b))
    .map((v) => ({ key: `rc-${v}`, label: v, count: count({ kind: 'ramConfig', value: v }), active: f.ramConfigs.includes(v), payload: v }));

  const speedMap = new Map<number, number>();
  for (const l of catalog) if (l.ram.speedMTs != null) speedMap.set(l.ram.speedMTs, (speedMap.get(l.ram.speedMTs) ?? 0) + 1);
  const ramSpeedOptions: FacetOption<number>[] = [...speedMap.keys()]
    .sort((a, b) => a - b)
    .map((v) => ({ key: `spd-${v}`, label: `${v} MT/s`, count: count({ kind: 'ramSpeed', value: v }), active: f.ramSpeeds.includes(v), payload: v }));

  const minStorageOptions: FacetOption<number>[] = [null, 256, 512, 1024, 2048].map((v) => ({
    key: `sto-${v}`,
    label: v == null ? 'Any' : v >= 1024 ? `${v / 1024}TB+` : `${v}GB+`,
    count: v == null ? runFilters(f, dest, catalog).length : count({ kind: 'minStorage', value: v }),
    active: f.minStorage === v,
    payload: v as number,
  })) as FacetOption<number>[];

  const resMap = new Map<string, number>();
  for (const l of catalog) resMap.set(l.display.resLabel, (resMap.get(l.display.resLabel) ?? 0) + 1);
  const resOrder = ['FHD', '1.5K', 'QHD', 'WQXGA', '2K', '2.8K', '3K', '3.5K', '4K'];
  const resolutionOptions: FacetOption<string>[] = resOrder
    .filter((r) => resMap.has(r))
    .map((v) => ({ key: `res-${v}`, label: v, count: count({ kind: 'resolution', value: v }), active: f.resolutions.includes(v), payload: v }));

  const panelMap = new Map<string, number>();
  for (const l of catalog) panelMap.set(l.display.panel, (panelMap.get(l.display.panel) ?? 0) + 1);
  const panelOptions: FacetOption<string>[] = [...panelMap.keys()].map((v) => ({
    key: `pan-${v}`, label: v, count: count({ kind: 'panel', value: v }), active: f.panels.includes(v), payload: v,
  }));

  const aspectOptions: FacetOption<string>[] = (['16:9', '16:10', '3:2'] as const).map((v) => ({
    key: `asp-${v}`, label: v, count: count({ kind: 'aspect', value: v }), active: f.aspects.includes(v), payload: v,
  }));

  // Brands → lines tree
  const brandMap = new Map<string, Map<string, number>>();
  for (const l of catalog) {
    const b = brandMap.get(l.brand) ?? new Map<string, number>();
    b.set(l.line, (b.get(l.line) ?? 0) + 1);
    brandMap.set(l.brand, b);
  }
  const brandOptions: (FacetOption<string> & { lines: { key: string; label: string; count: number; active: boolean }[] })[] =
    [...brandMap.entries()]
      .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
      .map(([brand, lines]) => ({
        key: `brand-${brand}`,
        label: brand,
        count: count({ kind: 'brand', value: brand }),
        active: f.brands.includes(brand),
        payload: brand,
        lines: [...lines.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([line]) => ({
          key: `line-${brand}-${line}`,
          label: line,
          count: count({ kind: 'line', value: line }),
          active: f.lines.includes(line),
        })),
      }));

  const originMap = new Map<string, number>();
  for (const l of catalog) for (const o of l.offers) originMap.set(o.origin, (originMap.get(o.origin) ?? 0) + 1);
  const originOptions: FacetOption<string>[] = [...originMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([v]) => ({ key: `org-${v}`, label: COUNTRY_BY_CODE[v]?.name ?? v, sub: COUNTRY_BY_CODE[v]?.flag, count: count({ kind: 'origin', value: v }), active: f.origins.includes(v), payload: v }));

  const currencyMap = new Map<string, number>();
  for (const l of catalog) for (const o of l.offers) currencyMap.set(o.currency, (currencyMap.get(o.currency) ?? 0) + 1);
  const currencyOptions: FacetOption<string>[] = [...currencyMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([v]) => ({ key: `cur-${v}`, label: v, count: count({ kind: 'currency', value: v }), active: f.currencies.includes(v), payload: v }));

  const osMap = new Map<string, number>();
  for (const l of catalog) osMap.set(l.os, (osMap.get(l.os) ?? 0) + 1);
  const osOptions: FacetOption<string>[] = [...osMap.entries()].map((v) => ({
    key: `os-${v[0]}`, label: v[0], count: count({ kind: 'os', value: v[0] }), active: f.oses.includes(v[0]), payload: v[0],
  }));

  const layoutMap = new Map<string, number>();
  for (const l of catalog) for (const lay of l.layouts) layoutMap.set(lay, (layoutMap.get(lay) ?? 0) + 1);
  const layoutOptions: FacetOption<string>[] = [...layoutMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([v]) => ({ key: `lay-${v}`, label: v, count: count({ kind: 'layout', value: v }), active: f.layouts.includes(v), payload: v }));

  const minWifiOptions: FacetOption<number>[] = [null, 1, 2, 3, 4].map((v) => {
    const label = v == null ? 'Any' : ['Any', 'Wi-Fi 5', 'Wi-Fi 6', 'Wi-Fi 6E', 'Wi-Fi 7'][v as number];
    return {
      key: `wifi-${v}`,
      label,
      count: v == null ? runFilters(f, dest, catalog).length : count({ kind: 'minWifi', value: v }),
      active: f.minWifi === v,
      payload: v as number,
    };
  }) as FacetOption<number>[];

  const baseCount = runFilters(f, dest, catalog).length;
  return {
    baseCount,
    use: useOptions,
    gpuVendor: gpuVendorOptions,
    minVram: minVramOptions,
    gpu: gpuOptions,
    cpuVendor: cpuVendorOptions,
    minCores: minCoresOptions,
    cpu: cpuOptions,
    ramType: ramTypeOptions,
    minRam: minRamOptions,
    ramConfig: ramConfigOptions,
    ramSpeed: ramSpeedOptions,
    minStorage: minStorageOptions,
    resolution: resolutionOptions,
    panel: panelOptions,
    aspect: aspectOptions,
    brands: brandOptions,
    origin: originOptions,
    currency: currencyOptions,
    os: osOptions,
    layout: layoutOptions,
    minWifi: minWifiOptions,
  };
}

export type Facets = ReturnType<typeof computeFacetCounts>;

// ─────────────────────────────────────────────────────────────────────────────
// Ranges for sliders (computed from data so sliders always fit the results)
// ─────────────────────────────────────────────────────────────────────────────

export function priceRange(f: Filters, dest: string, catalog: Laptop[] = CATALOG): [number, number] {
  const spec: Filters = { ...f, budget: null };
  const res = runFilters(spec, dest, catalog);
  if (!res.length) return [0, 5000];
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of res) {
    lo = Math.min(lo, r.offers[0].total);
    hi = Math.max(hi, r.offers[r.offers.length - 1].total);
  }
  return [Math.floor(lo / 50) * 50, Math.ceil(hi / 50) * 50];
}

export const RAM_SPEEDS_BY_TYPE: Record<RamType, number[]> = {
  DDR4: [2400, 2933, 3200, 4800],
  DDR5: [4800, 5200, 5600, 6000, 6400],
  LPDDR4x: [4266, 4533],
  LPDDR5: [5500, 6000, 6400],
  LPDDR5x: [6400, 7467, 7500, 8000, 8533],
  Unified: [],
};
