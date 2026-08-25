import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownUp, Check, SlidersHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import type { SortKey } from '../lib/filter';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'total-asc', label: 'Price · low to high' },
  { key: 'total-desc', label: 'Price · high to low' },
  { key: 'discount-desc', label: 'Biggest discount' },
  { key: 'rating-desc', label: 'Top rated' },
  { key: 'newest', label: 'Newest first' },
];

function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="inline-block tabular-nums"
    >
      {value}
    </motion.span>
  );
}

export function Toolbar({
  count,
  offerCount,
  sort,
  onSort,
  onOpenFilters,
  activeFilters,
}: {
  count: number;
  offerCount: number;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  onOpenFilters: () => void;
  activeFilters: number;
}) {
  const [open, setOpen] = useState(false);
  const current = SORTS.find((s) => s.key === sort) ?? SORTS[0];

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenFilters}
          className="relative flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] font-bold text-ink-800 shadow-sm transition hover:border-accent-300 lg:hidden"
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilters > 0 && (
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">{activeFilters}</span>
          )}
        </button>
        <p className="text-[13.5px] font-medium text-ink-500">
          <span className="text-[17px] font-extrabold text-ink-950">
            <AnimatedNumber value={count} />
          </span>{' '}
          laptop{count === 1 ? '' : 's'}
          <span className="mx-1.5 text-ink-300">·</span>
          <AnimatedNumber value={offerCount} /> offers tracked
        </p>
      </div>

      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setOpen((o) => !o)}
          className={clsx(
            'flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] font-bold shadow-sm transition',
            open ? 'border-accent-400 bg-accent-50 text-accent-700' : 'border-ink-200 bg-white text-ink-800 hover:border-accent-300',
          )}
        >
          <ArrowDownUp size={14} className={open ? 'text-accent-600' : 'text-ink-400'} />
          {current.label}
          <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-ink-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </motion.span>
        </motion.button>
        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border border-ink-100 bg-white p-1.5 shadow-2xl"
              >
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => {
                      onSort(s.key);
                      setOpen(false);
                    }}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12.5px] font-semibold transition-colors',
                      s.key === sort ? 'bg-accent-50 text-accent-700' : 'text-ink-600 hover:bg-ink-50',
                    )}
                  >
                    {s.label}
                    {s.key === sort && <Check size={14} />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
