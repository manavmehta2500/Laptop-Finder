import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff, Layers, RefreshCw, Wifi } from 'lucide-react';
import { Header } from './components/Header';
import { CountryModal } from './components/CountryModal';
import FilterPanel from './components/FilterPanel';
import { LaptopCard } from './components/LaptopCard';
import { Toolbar } from './components/Toolbar';
import { Toasts, type Toast } from './components/Toasts';
import { Background } from './components/Background';
import { EmptyState } from './components/EmptyState';
import { Ago } from './components/Ago';
import { computeFacetCounts, DEFAULT_FILTERS, priceRange, runFilters, type Filters } from './lib/filter';
import { COUNTRY_BY_CODE, TRACKED_SITES } from './lib/config';
import type { Laptop, PriceEventType, SiteInfo } from './lib/types';

const COUNTRY_KEY = 'lf-country';

interface Bootstrap {
  laptops: Laptop[];
  sites: SiteInfo[];
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
      <div className="shimmer aspect-[16/9]" />
      <div className="space-y-3 p-4">
        <div className="shimmer h-3 w-1/3 rounded" />
        <div className="shimmer h-4 w-2/3 rounded" />
        <div className="grid grid-cols-2 gap-1.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="shimmer h-9 rounded-lg" />
          ))}
        </div>
        <div className="shimmer h-20 rounded-xl" />
      </div>
    </div>
  );
}

export default function App() {
  const [laptops, setLaptops] = useState<Laptop[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(() => {
    const c = localStorage.getItem(COUNTRY_KEY);
    return c && COUNTRY_BY_CODE[c] ? c : null;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flashes, setFlashes] = useState<Record<string, { dir: 'up' | 'down'; ts: number }>>({});
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const toastId = useRef(0);

  const country = countryCode ? COUNTRY_BY_CODE[countryCode] : null;
  const ready = laptops !== null;

  const chooseCountry = useCallback((code: string) => {
    setCountryCode(code);
    localStorage.setItem(COUNTRY_KEY, code);
    setPickerOpen(false);
  }, []);

  const patch = useCallback((p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p })), []);
  const resetFilters = useCallback(() => setFilters({ ...DEFAULT_FILTERS }), []);

  // ── bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    fetch('/api/bootstrap')
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json() as Promise<Bootstrap>;
      })
      .then((d) => {
        if (!alive) return;
        setLaptops(d.laptops);
      })
      .catch((e) => alive && setLoadError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  // ── live monitor feed (SSE) ───────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      es = new EventSource('/api/events');
      es.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'hello') {
          setUpdateCount((c) => c + (msg.events ?? 0));
          return;
        }
        if (msg.type !== 'prices' || !Array.isArray(msg.events)) return;
        const events = msg.events as { type: PriceEventType; offerId: string; laptopId: string; message: string; price: number; oldPrice: number | null; ts: number }[];

        const flashMap: Record<string, { dir: 'up' | 'down'; ts: number }> = {};
        for (const ev of events) {
          flashMap[ev.laptopId] = { dir: ev.type === 'price-rise' || ev.type === 'discount-end' ? 'up' : 'down', ts: ev.ts };
        }

        setLaptops((prev) => {
          if (!prev) return prev;
          return prev.map((l) => {
            const evs = events.filter((ev) => ev.laptopId === l.id);
            if (!evs.length) return l;
            return {
              ...l,
              offers: l.offers.map((o) => {
                const ev = evs.find((x) => x.offerId === o.id);
                return ev ? { ...o, price: ev.price, oldPrice: ev.oldPrice, updatedAt: ev.ts } : o;
              }),
            };
          });
        });
        setFlashes((f) => ({ ...f, ...flashMap }));
        setUpdateCount((c) => c + events.length);
        setLastUpdate(Date.now());
        const ids: number[] = [];
        for (const ev of events) {
          toastId.current += 1;
          ids.push(toastId.current);
          setToasts((t) => [{ id: toastId.current, type: ev.type, message: ev.message }, ...t].slice(0, 4));
        }
        for (const id of ids) {
          setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 6500);
        }
        setTimeout(
          () =>
            setFlashes((f) => {
              const n = { ...f };
              for (const k of Object.keys(n)) if (Date.now() - n[k].ts > 5200) delete n[k];
              return n;
            }),
          5300,
        );
      };
      es.onerror = () => {
        es?.close();
        if (!closed) retry = setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      closed = true;
      es?.close();
      if (retry) clearTimeout(retry);
    };
  }, [ready]);

  // ── derived ───────────────────────────────────────────────────────────────
  const results = useMemo(() => (country && laptops ? runFilters(filters, country.code, laptops) : []), [filters, country, laptops]);
  const budgetDomain = useMemo<[number, number]>(
    () => (country && laptops ? priceRange(filters, country.code, laptops) : [0, 5000]),
    [filters, country, laptops],
  );
  const facets = useMemo(() => (country && laptops ? computeFacetCounts(filters, country.code, laptops) : null), [filters, country, laptops]);
  const offerCount = useMemo(() => results.reduce((a, r) => a + r.offers.length, 0), [results]);

  // keep budget inside the current domain when the country/currency changes
  useEffect(() => {
    setFilters((f) => {
      if (!f.budget) return f;
      if (f.budget[0] >= budgetDomain[0] && f.budget[1] <= budgetDomain[1]) return f;
      return { ...f, budget: null };
    });
  }, [budgetDomain]);

  const activeTotal = useMemo(() => {
    const fr = filters;
    let n = 0;
    if (fr.budget) n++;
    n += fr.use.length;
    if (fr.discountRange[0] !== 0 || fr.discountRange[1] !== 40) n++;
    if (fr.discountOnly) n++;
    if (fr.dutyFreeOnly) n++;
    n += fr.gpuVendors.length + (fr.minVram != null ? 1 : 0) + fr.gpus.length;
    n += fr.cpuVendors.length + (fr.minCores != null ? 1 : 0) + fr.cpus.length;
    n += fr.ramTypes.length + (fr.minRam != null ? 1 : 0) + fr.ramConfigs.length + fr.ramSpeeds.length + (fr.upgradeableOnly ? 1 : 0) + (fr.minStorage != null ? 1 : 0);
    n += fr.resolutions.length + (fr.refresh[0] !== 60 || fr.refresh[1] !== 240 ? 1 : 0) + fr.panels.length + fr.aspects.length + (fr.touch !== 'any' ? 1 : 0) + (fr.screenSize[0] !== 13 || fr.screenSize[1] !== 17 ? 1 : 0);
    n += fr.brands.length + fr.lines.length;
    n += fr.oses.length + fr.layouts.length + (fr.minWifi != null ? 1 : 0);
    n += fr.origins.length + fr.currencies.length;
    if (fr.search.trim()) n++;
    return n;
  }, [filters]);

  // ── loading / error ───────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-sm rounded-3xl border border-ink-100 bg-white p-8 text-center shadow-card">
          <CloudOff className="mx-auto text-ink-300" size={40} />
          <h1 className="mt-4 text-lg font-extrabold text-ink-900">Monitor server unreachable</h1>
          <p className="mt-1 text-[13px] text-ink-500">The price monitor ({loadError}) is not responding. Start it with <code className="rounded bg-ink-100 px-1">npm run dev</code>.</p>
          <button onClick={() => location.reload()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-accent-700">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Background />

      {/* animated app window entrance */}
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <Header
          country={country}
          onCountryChange={chooseCountry}
          onOpenCountryPicker={() => setPickerOpen(true)}
          search={filters.search}
          onSearch={(v) => patch({ search: v })}
          liveUpdates={updateCount}
          lastUpdate={lastUpdate}
        />

        <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6">
          {/* hero strip */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink-950 sm:text-3xl">
                Find your next laptop<span className="text-accent-600">.</span>
              </h1>
              <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-ink-500">
                Every offer converted to <b className="text-ink-700">{country ? `${country.currency} (${country.name})` : 'your currency'}</b> with the exact import tax added — the total you see is the total you pay.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: <Layers size={13} />, label: `${laptops?.length ?? '—'} models` },
                { icon: <Wifi size={13} />, label: `${TRACKED_SITES.length} trusted sites` },
              ].map((s) => (
                <span key={s.label} className="flex items-center gap-1.5 rounded-full border border-ink-100 bg-white/80 px-3 py-1.5 text-[11.5px] font-bold text-ink-600 shadow-sm">
                  <span className="text-accent-600">{s.icon}</span>
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-5">
            {/* desktop filter rail */}
            <aside className="sticky top-20 hidden h-[calc(100vh-6.5rem)] w-[308px] shrink-0 lg:block">
              {facets && country ? (
                <FilterPanel
                  filters={filters}
                  patch={patch}
                  facets={facets}
                  country={country.code}
                  budgetDomain={budgetDomain}
                  onReset={resetFilters}
                  activeTotal={activeTotal}
                />
              ) : (
                <div className="shimmer h-full rounded-2xl" />
              )}
            </aside>

            {/* results */}
            <section className="min-w-0 flex-1">
              {country && facets ? (
                <>
                  <Toolbar
                    count={results.length}
                    offerCount={offerCount}
                    sort={filters.sort}
                    onSort={(s) => patch({ sort: s })}
                    onOpenFilters={() => setMobileFilters(true)}
                    activeFilters={activeTotal}
                  />
                  {laptops ? (
                    results.length > 0 ? (
                      <motion.div layout className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                        <AnimatePresence mode="popLayout">
                          {results.map((r) => (
                            <LaptopCard key={r.laptop.id} result={r} country={country.code} flash={flashes[r.laptop.id]?.dir ?? null} />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    ) : (
                      <EmptyState onReset={resetFilters} />
                    )
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {[...Array(6)].map((_, i) => (
                        <SkeletonCard key={i} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* footer */}
          <footer className="mt-10 rounded-2xl border border-ink-100 bg-white/70 px-5 py-4 text-center backdrop-blur">
            <p className="text-[11.5px] leading-relaxed text-ink-400">
              <b className="text-ink-600">Live price monitor</b> — watching {TRACKED_SITES.length} proper retailers & manufacturer stores 24/7 (MediaMarkt, Coolblue, Alternate, Micro Center, Currys, Scan, LDLC, Fnac, Bol, B&H, Best Buy…).
              No eBay, AliExpress, Alibaba or Temu. Prices are converted live to {country ? `${country.currency}` : 'your currency'} and cross-border offers include the exact import VAT.
              <span className="mx-1.5">·</span>
              <span className="text-emerald-600">{updateCount} live updates this session · last one <Ago ts={lastUpdate} /></span>
            </p>
          </footer>
        </main>
      </motion.div>

      {/* first-visit country picker */}
      <CountryModal open={!country} chosen={countryCode} onPick={chooseCountry} />
      <CountryModal open={pickerOpen} chosen={countryCode} onPick={chooseCountry} />

      {/* mobile filter drawer */}
      <AnimatePresence>
        {mobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFilters(false)}
              className="fixed inset-0 z-50 bg-ink-950/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: -340 }}
              animate={{ x: 0 }}
              exit={{ x: -340 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 top-0 z-50 w-[min(330px,88vw)] p-3 lg:hidden"
            >
              {facets && country && (
                <FilterPanel
                  filters={filters}
                  patch={patch}
                  facets={facets}
                  country={country.code}
                  budgetDomain={budgetDomain}
                  onReset={() => {
                    resetFilters();
                    setMobileFilters(false);
                  }}
                  activeTotal={activeTotal}
                />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
