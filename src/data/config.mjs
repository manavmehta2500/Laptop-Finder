
/**
 * Countries the user can view prices in.
 * importRate = the tax added on top of the site price when the goods ship from
 * OUTSIDE this country's free-trade region (VAT on import for EU/UK/CH/CA/AU,
 * 0 for the US which has no federal consumption tax on consumer imports).
 * EU→EU and UK→UK etc. cross-border orders pay no extra import tax (VAT is
 * already included in the listed price of an EU/UK shop).
 */
export const COUNTRIES = [
  { code: 'BE', name: 'Belgium', flag: '🇧', currency: 'EUR', region: 'EU', importRate: 0.21, vatLabel: '21% VAT' },
  { code: 'DE', name: 'Germany', flag: '🇩', currency: 'EUR', region: 'EU', importRate: 0.19, vatLabel: '19% VAT' },
  { code: 'FR', name: 'France', flag: '🇫', currency: 'EUR', region: 'EU', importRate: 0.2, vatLabel: '20% VAT' },
  { code: 'NL', name: 'Netherlands', flag: '🇳', currency: 'EUR', region: 'EU', importRate: 0.21, vatLabel: '21% VAT' },
  { code: 'ES', name: 'Spain', flag: '🇪', currency: 'EUR', region: 'EU', importRate: 0.21, vatLabel: '21% VAT' },
  { code: 'IT', name: 'Italy', flag: '🇮', currency: 'EUR', region: 'EU', importRate: 0.22, vatLabel: '22% VAT' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN', region: 'EU', importRate: 0.23, vatLabel: '23% VAT' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', region: 'UK', importRate: 0.2, vatLabel: '20% VAT' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', region: 'US', importRate: 0 },
  { code: 'CA', name: 'Canada', flag: '🇨', currency: 'CAD', region: 'CA', importRate: 0.13, vatLabel: '13% GST' },
  { code: 'AU', name: 'Australia', flag: '🇦', currency: 'AUD', region: 'AU', importRate: 0.1, vatLabel: '10% GST' },
  { code: 'CH', name: 'Switzerland', flag: '🇨', currency: 'CHF', region: 'CH', importRate: 0.081, vatLabel: '8.1% VAT' },
];

export const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

/**
 * Exchange rates: 1 USD in each currency (static demo rates — a production
 * build would poll a live FX feed; the monitor server already reserves the
 * place for it in /api/config).
 */
export const FX_RATES = {
  USD: 1,
  EUR: 0.862,
  GBP: 0.741,
  CAD: 1.372,
  AUD: 1.528,
  CHF: 0.801,
  PLN: 3.94,
};

/** All offer currencies that appear on the "proper" websites we track. */
export const OFFER_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF'];

/**
 * The websites Laptop Finder tracks. Rule: only proper retailers and
 * manufacturer stores — no eBay, AliExpress, Alibaba, Temu, Vinted, private
 * marketplaces or drop-ship junk. (This is the allow-list the AI monitor uses.)
 */
export const TRACKED_SITES = [
  { name: 'Best Buy', country: 'US', currency: 'USD', kind: 'retailer' },
  { name: 'Micro Center', country: 'US', currency: 'USD', kind: 'retailer' },
  { name: 'Amazon US', country: 'US', currency: 'USD', kind: 'retailer' },
  { name: 'B&H Photo', country: 'US', currency: 'USD', kind: 'retailer' },
  { name: 'MediaMarkt.de', country: 'DE', currency: 'EUR', kind: 'retailer' },
  { name: 'Alternate', country: 'DE', currency: 'EUR', kind: 'retailer' },
  { name: 'Notebooksbilliger', country: 'DE', currency: 'EUR', kind: 'retailer' },
  { name: 'MediaMarkt.be', country: 'BE', currency: 'EUR', kind: 'retailer' },
  { name: 'MediaMarkt.fr', country: 'FR', currency: 'EUR', kind: 'retailer' },
  { name: 'Coolblue', country: 'BE', currency: 'EUR', kind: 'retailer' },
  { name: 'Bol.com', country: 'BE', currency: 'EUR', kind: 'retailer' },
  { name: 'Fnac', country: 'FR', currency: 'EUR', kind: 'retailer' },
  { name: 'LDLC', country: 'FR', currency: 'EUR', kind: 'retailer' },
  { name: 'Currys', country: 'UK', currency: 'GBP', kind: 'retailer' },
  { name: 'Scan', country: 'UK', currency: 'GBP', kind: 'retailer' },
  { name: 'Amazon UK', country: 'UK', currency: 'GBP', kind: 'retailer' },
  { name: 'Lenovo', country: 'US', currency: 'USD', kind: 'manufacturer' },
  { name: 'Lenovo BE', country: 'BE', currency: 'EUR', kind: 'manufacturer' },
  { name: 'Lenovo DE', country: 'DE', currency: 'EUR', kind: 'manufacturer' },
  { name: 'ASUS', country: 'US', currency: 'USD', kind: 'manufacturer' },
  { name: 'ASUS BE', country: 'BE', currency: 'EUR', kind: 'manufacturer' },
  { name: 'Dell', country: 'US', currency: 'USD', kind: 'manufacturer' },
  { name: 'HP', country: 'US', currency: 'USD', kind: 'manufacturer' },
  { name: 'MSI', country: 'US', currency: 'USD', kind: 'manufacturer' },
  { name: 'Apple', country: 'US', currency: 'USD', kind: 'manufacturer' },
  { name: 'Apple BE', country: 'BE', currency: 'EUR', kind: 'manufacturer' },
  { name: 'Razer', country: 'US', currency: 'USD', kind: 'manufacturer' },
  { name: 'Framework', country: 'US', currency: 'USD', kind: 'manufacturer' },
  { name: 'Acer', country: 'US', currency: 'USD', kind: 'manufacturer' },
  { name: 'Samsung', country: 'US', currency: 'USD', kind: 'manufacturer' },
  { name: 'Gigabyte', country: 'US', currency: 'USD', kind: 'manufacturer' },
];

/**
 * Import-tax rate for shipping from `origin` (ISO) to `dest` (ISO).
 * 0 when both are in the same free-trade region (EU single market, etc.),
 * because EU/UK shops already include VAT in the price they list.
 */
export function importRateFor(origin, dest) {
  const o = COUNTRY_BY_CODE[origin];
  const d = COUNTRY_BY_CODE[dest];
  if (!o || !d) return 0;
  if (o.region === d.region) return 0;
  return d.importRate;
}

export const CURRENCY_SYMBOL = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF ',
  PLN: 'zł',
};

export function formatMoney(amount, currency, compact = false) {
  const sym = CURRENCY_SYMBOL[currency] ?? `${currency} `;
  const n = compact
    ? Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)
    : Intl.NumberFormat('en', { maximumFractionDigits: amount >= 1000 ? 0 : 2, minimumFractionDigits: amount >= 1000 ? 0 : 2 }).format(amount);
  return `${sym}${n}`;
}
