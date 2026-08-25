import type { Country, SiteInfo } from '../lib/types';
export declare const COUNTRIES: Country[];
export declare const COUNTRY_BY_CODE: Record<string, Country>;
export declare const FX_RATES: Record<string, number>;
export declare const OFFER_CURRENCIES: string[];
export declare const TRACKED_SITES: SiteInfo[];
export declare function importRateFor(origin: string, dest: string): number;
export declare const CURRENCY_SYMBOL: Record<string, string>;
export declare function formatMoney(amount: number, currency: string, compact?: boolean): string;
