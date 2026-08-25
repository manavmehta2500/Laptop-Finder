export type CpuVendor = 'Intel' | 'AMD' | 'Apple' | 'Qualcomm';
export type GpuVendor = 'NVIDIA' | 'AMD' | 'Intel' | 'Apple' | 'Qualcomm';

export type UseCase = 'gaming' | 'work' | 'student' | 'creator' | 'business' | 'ultrabook';

export interface CpuSpec {
  name: string;
  vendor: CpuVendor;
  cores: number;
}

export interface GpuSpec {
  name: string;
  vendor: GpuVendor;
  /** VRAM in GB; null for integrated GPUs */
  vramGB: number | null;
}

export type RamType = 'DDR4' | 'DDR5' | 'LPDDR4x' | 'LPDDR5' | 'LPDDR5x' | 'Unified';

export interface RamSpec {
  sizeGB: number;
  type: RamType;
  /** Memory speed in MT/s (null for Apple unified memory) */
  speedMTs: number | null;
  /** e.g. "1x16GB", "2x16GB", "Unified" */
  config: string;
  upgradeable: boolean;
}

export interface StorageSpec {
  sizeGB: number;
  type: 'SSD' | 'NVMe SSD' | 'HDD+SSD';
}

export interface DisplaySpec {
  sizeInches: number;
  width: number;
  height: number;
  /** Short label: FHD, QHD, 2.8K, 3K, 4K, 5K */
  resLabel: string;
  refreshHz: number;
  panel: 'IPS' | 'OLED' | 'Tandem OLED' | 'Mini-LED';
  aspect: '16:9' | '16:10' | '3:2';
  touch: boolean;
}

export interface Offer {
  id: string;
  site: string;
  /** Exact product page on the retailer */
  url: string;
  /** Country the offer ships from (ISO code) */
  origin: string;
  /** ISO 4217 currency the site charges in */
  currency: string;
  /** Current price in the site's currency */
  price: number;
  /** Pre-discount price in the site's currency (null = no discount) */
  oldPrice: number | null;
  inStock: boolean;
  /** Updated timestamp (ms) */
  updatedAt: number;
  /** Live-monitor metadata (set by the monitor, absent in raw seed) */
  verified?: boolean;
  verifiedAt?: number | null;
  scrape?: { kind: string; [k: string]: unknown } | null;
}

export interface Laptop {
  id: string;
  brand: string;
  /** Brand line / family, e.g. "Legion", "LOQ", "ROG Strix" */
  line: string;
  name: string;
  category: UseCase;
  cpu: CpuSpec;
  /** Discrete GPU if present — this is the "main GPU" for gaming laptops */
  gpu: GpuSpec | null;
  /** Integrated GPU (always present, may be null for very old machines) */
  igpu: GpuSpec | null;
  ram: RamSpec;
  storage: StorageSpec;
  display: DisplaySpec;
  os: string;
  layouts: string[];
  wifi: string;
  weightKg: number;
  batteryWh: number | null;
  rating: number;
  year: number;
  image: string;
  offers: Offer[];
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
  vatLabel?: string;
  region: 'EU' | 'US' | 'UK' | 'CH' | 'CA' | 'AU';
  /** import/VAT rate applied to goods arriving from OUTSIDE this region group (0..1) */
  importRate: number;
}

export type PriceEventType = 'discount-start' | 'discount-end' | 'price-drop' | 'price-rise';

export interface PriceEvent {
  type: PriceEventType;
  offerId: string;
  laptopId: string;
  site: string;
  laptopName: string;
  price: number;
  oldPrice: number | null;
  currency: string;
  message: string;
  ts: number;
}

export interface SiteInfo {
  name: string;
  country: string;
  currency: string;
  kind: 'retailer' | 'manufacturer' | 'marketplace';
}
