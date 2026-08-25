import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Globe2, Laptop, Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { COUNTRIES } from '../lib/config';
import type { Country } from '../lib/types';
import { Ago } from './Ago';

export function Header({
  country,
  onCountryChange,
  onOpenCountryPicker,
  search,
  onSearch,
  liveUpdates,
  lastUpdate,
}: {
  country: Country | null;
  onCountryChange: (code: string) => void;
  onOpenCountryPicker: () => void;
  search: string;
  onSearch: (v: string) => void;
  liveUpdates: number;
  lastUpdate: number | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="glass sticky top-0 z-40 border-b border-ink-100/80">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:gap-4 sm:px-6">
        {/* logo */}
        <a href="#" className="group flex shrink-0 items-center gap-2.5" onClick={(e) => e.preventDefault()}>
          <motion.span
            whileHover={{ rotate: -6, scale: 1.05 }}
            className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-glow"
          >
            <Laptop size={18} />
          </motion.span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-[15px] font-extrabold tracking-tight text-ink-950">
              Laptop<span className="text-accent-600">Finder</span>
            </span>
            <span className="block text-[10px] font-medium text-ink-400">live prices · true totals</span>
          </span>
        </a>

        {/* search */}
        <div className="relative min-w-0 flex-1 sm:max-w-xl">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search laptops, chips, GPUs…"
            className="w-full rounded-xl border border-ink-200 bg-white/80 py-2.5 pl-10 pr-9 text-[13.5px] text-ink-900 shadow-sm outline-none transition placeholder:text-ink-300 hover:border-ink-300 focus:border-accent-400 focus:bg-white focus:ring-4 focus:ring-accent-100"
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* live monitor badge */}
        <div className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 md:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-bold text-emerald-700">Live monitor</p>
            <p className="text-[9.5px] font-medium text-emerald-600/80">
              {liveUpdates} updates · <Ago ts={lastUpdate} />
            </p>
          </div>
        </div>

        {/* country selector */}
        <div className="relative shrink-0">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setOpen((o) => !o)}
            className={clsx(
              'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left shadow-sm transition',
              open ? 'border-accent-400 bg-accent-50 ring-4 ring-accent-100' : 'border-ink-200 bg-white/80 hover:border-accent-300 hover:bg-accent-50/60',
            )}
          >
            <Globe2 size={16} className="text-accent-600" />
            <span className="hidden leading-tight sm:block">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-400">Your country</span>
              <span className="block text-[13px] font-bold text-ink-900">
                {country ? `${country.flag} ${country.name}` : 'Choose…'}
              </span>
            </span>
            <span className="sm:hidden text-[15px]">{country?.flag ?? '🌍'}</span>
            <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-ink-400">
              <ChevronDown size={15} />
            </motion.span>
          </motion.button>

          <AnimatePresence>
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute right-0 z-50 mt-2 w-[300px] origin-top-right overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">View prices for</p>
                    <button onClick={onOpenCountryPicker} className="text-[11px] font-semibold text-accent-600 hover:underline">
                      Full picker
                    </button>
                  </div>
                  <div className="max-h-[340px] overflow-y-auto p-1.5">
                    {COUNTRIES.map((c) => {
                      const active = country?.code === c.code;
                      return (
                        <button
                          key={c.code}
                          onClick={() => {
                            onCountryChange(c.code);
                            setOpen(false);
                          }}
                          className={clsx(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                            active ? 'bg-accent-50' : 'hover:bg-ink-50',
                          )}
                        >
                          <span className="text-[19px] leading-none">{c.flag}</span>
                          <span className="min-w-0 flex-1">
                            <span className={clsx('block text-[13px] font-semibold', active ? 'text-accent-700' : 'text-ink-800')}>{c.name}</span>
                            <span className="block text-[10.5px] text-ink-400">
                              {c.currency}
                              {c.vatLabel ? ` · ${c.vatLabel} on imports` : ' · no import tax'}
                            </span>
                          </span>
                          {active && (
                            <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} viewBox="0 0 20 20" className="h-4 w-4 text-accent-600" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z" clipRule="evenodd" />
                            </motion.svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
