import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

/* ────────────────────────── Toggle ────────────────────────── */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-left transition-colors hover:bg-ink-100/70"
    >
      <span>
        <span className="block text-[13px] font-medium text-ink-800">{label}</span>
        {hint && <span className="block text-[11px] leading-snug text-ink-400">{hint}</span>}
      </span>
      <span
        className={clsx(
          'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-300',
          checked ? 'bg-accent-500' : 'bg-ink-200',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={clsx(
            'absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm',
            checked ? 'left-[19px]' : 'left-[3px]',
          )}
        />
      </span>
    </button>
  );
}

/* ────────────────────────── Chip ────────────────────────── */
export function Chip({
  label,
  active,
  disabled,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all duration-200',
        active
          ? 'border-accent-500 bg-accent-500 text-white shadow-[0_2px_10px_-2px_rgba(51,84,247,.5)]'
          : disabled
            ? 'cursor-not-allowed border-ink-100 bg-white/40 text-ink-300'
            : 'border-ink-200 bg-white text-ink-700 hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700',
      )}
    >
      {label}
      {typeof count === 'number' && (
        <span
          className={clsx(
            'rounded-full px-1.5 text-[10.5px] tabular-nums',
            active ? 'bg-white/20 text-white' : count === 0 ? 'bg-ink-50 text-ink-300' : 'bg-ink-100 text-ink-500',
          )}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}

/* ────────────────────────── Dual range slider ────────────────────────── */
interface DualSliderProps {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  format: (n: number) => string;
  label?: string;
  /** shows an "Any" pill when the slider sits at the full domain */
  isAny?: boolean;
  onAny?: () => void;
}

export function DualSlider({ min, max, step, value, onChange, format, label, isAny, onAny }: DualSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<null | 'lo' | 'hi'>(null);
  const [loInput, setLoInput] = useState<string | null>(null);
  const [hiInput, setHiInput] = useState<string | null>(null);

  const [lo, hi] = value;
  const pct = (n: number) => ((n - min) / (max - min)) * 100;

  const valueFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return lo;
    const r = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const raw = min + t * (max - min);
    return Math.round(raw / step) * step;
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const v = valueFromX(e.clientX);
      if (dragging === 'lo') onChange([Math.min(v, hi - step), hi]);
      else onChange([lo, Math.max(v, lo + step)]);
    };
    const up = () => setDragging(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  });

  const clampInput = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div>
      {label && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium text-ink-500">{label}</span>
          {isAny ? (
            onAny && (
              <button
                onClick={onAny}
                className="rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-semibold text-ink-500 transition hover:bg-ink-200"
              >
                Any
              </button>
            )
          ) : (
            <button
              onClick={onAny}
              className="rounded-full bg-accent-50 px-2 py-0.5 text-[10.5px] font-semibold text-accent-600 transition hover:bg-accent-100"
            >
              Reset
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="w-[74px] rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[12px] font-semibold tabular-nums text-ink-800 outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
          value={loInput ?? format(lo)}
          onChange={(e) => setLoInput(e.target.value)}
          onBlur={() => {
            const n = loInput == null ? lo : clampInput(parseFloat(loInput) || min);
            onChange([Math.min(n, hi - step), hi]);
            setLoInput(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <div
          ref={trackRef}
          className="dual-slider relative h-8 flex-1 cursor-pointer"
          onPointerDown={(e) => {
            const v = valueFromX(e.clientX);
            const isLo = Math.abs(v - lo) <= Math.abs(v - hi);
            setDragging(isLo ? 'lo' : 'hi');
          }}
        >
          <div className="absolute top-1/2 h-[5px] w-full -translate-y-1/2 rounded-full bg-ink-100" />
          <div
            className="absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-gradient-to-r from-accent-400 to-accent-600"
            style={{ left: `${pct(lo)}%`, width: `${Math.max(0, pct(hi) - pct(lo))}%` }}
          />
          {(['lo', 'hi'] as const).map((which) => {
            const v = which === 'lo' ? lo : hi;
            return (
              <motion.div
                key={which}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDragging(which);
                }}
                animate={{ scale: dragging === which ? 1.25 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="thumb absolute top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-accent-500 bg-white shadow-md"
                style={{ left: `${pct(v)}%` }}
              />
            );
          })}
        </div>
        <input
          type="number"
          className="w-[74px] rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[12px] font-semibold tabular-nums text-ink-800 outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
          value={hiInput ?? format(hi)}
          onChange={(e) => setHiInput(e.target.value)}
          onBlur={() => {
            const n = hiInput == null ? hi : clampInput(parseFloat(hiInput) || max);
            onChange([lo, Math.max(n, lo + step)]);
            setHiInput(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>
    </div>
  );
}

/* ────────────────────────── Option row (list) ────────────────────────── */
export function OptionRow({
  label,
  sub,
  count,
  active,
  unavailable,
  onClick,
}: {
  label: string;
  sub?: string;
  count: number;
  active: boolean;
  unavailable: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      disabled={unavailable}
      className={clsx(
        'group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors',
        unavailable
          ? 'cursor-not-allowed opacity-45'
          : active
            ? 'bg-accent-50'
            : 'hover:bg-ink-100/80',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={clsx(
            'grid h-4 w-4 shrink-0 place-items-center rounded-[6px] border transition-all',
            active ? 'border-accent-500 bg-accent-500' : 'border-ink-300 bg-white group-hover:border-accent-400',
          )}
        >
          {active && (
            <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M1 4.2 3.6 6.8 9 1.4" />
            </svg>
          )}
        </span>
        <span className="min-w-0">
          <span className={clsx('block truncate text-[13px]', active ? 'font-semibold text-accent-700' : 'font-medium text-ink-700')}>
            {label}
          </span>
          {sub && <span className="block truncate text-[10.5px] text-ink-400">{sub}</span>}
        </span>
      </span>
      <span
        className={clsx(
          'shrink-0 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums',
          unavailable ? 'bg-ink-50 text-ink-300' : active ? 'bg-accent-100 text-accent-700' : 'bg-ink-100 text-ink-500',
        )}
      >
        {count}
      </span>
    </motion.button>
  );
}

/* ────────────────────────── Collapsible filter section ────────────────────────── */
export function FilterSection({
  title,
  icon,
  activeCount,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  activeCount: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-ink-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-ink-100/50"
      >
        <span className="flex items-center gap-2.5">
          <span className={clsx('grid h-7 w-7 place-items-center rounded-lg transition-colors', activeCount ? 'bg-accent-100 text-accent-600' : 'bg-ink-100 text-ink-500')}>
            {icon}
          </span>
          <span className="text-[13.5px] font-semibold text-ink-800">{title}</span>
          {activeCount > 0 && (
            <motion.span
              key={activeCount}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white"
            >
              {activeCount}
            </motion.span>
          )}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="text-ink-400">
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className="overflow-hidden"
      >
        <div className="space-y-3 px-4 pb-4">{children}</div>
      </motion.div>
    </div>
  );
}

/* ────────────────────────── Search box for option lists ────────────────────────── */
export function OptionSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ink-200 bg-white py-1.5 pl-8 pr-7 text-[12.5px] text-ink-800 outline-none transition placeholder:text-ink-300 focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-ink-300 transition hover:bg-ink-100 hover:text-ink-600"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ────────────────────────── Sorted option list (available on top, grayed below) ────────────────────────── */
export function OptionList<T>({
  options,
  searchValue,
  onSearch,
  searchPlaceholder,
  visible = 6,
  render,
  toggle,
  emptyText = 'Nothing matches your search',
}: {
  options: { key: string; label: string; sub?: string; count: number; active: boolean; payload: T }[];
  searchValue: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  visible?: number;
  render?: (opt: (typeof options)[number]) => React.ReactNode;
  toggle: (payload: T) => void;
  emptyText?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const searched = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.sub ?? ''}`.toLowerCase().includes(q));
  }, [options, searchValue]);

  const available = searched.filter((o) => o.count > 0);
  const unavailable = searched.filter((o) => o.count === 0);
  const shown = expanded ? available : available.slice(0, visible);
  const hiddenCount = available.length - shown.length;

  return (
    <div className="space-y-1.5">
      <OptionSearch value={searchValue} onChange={onSearch} placeholder={searchPlaceholder} />
      <div className="max-h-[280px] space-y-0.5 overflow-y-auto pr-1">
        {searched.length === 0 && <p className="px-2 py-3 text-center text-[12px] text-ink-400">{emptyText}</p>}
        {shown.map((o) =>
          render ? (
            <React.Fragment key={o.key}>{render(o)}</React.Fragment>
          ) : (
            <OptionRow key={o.key} label={o.label} sub={o.sub} count={o.count} active={o.active} unavailable={o.count === 0} onClick={() => toggle(o.payload)} />
          ),
        )}
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full rounded-lg py-1.5 text-[12px] font-semibold text-accent-600 transition hover:bg-accent-50"
          >
            See more ({hiddenCount})
          </button>
        )}
        {/* unavailable options sink to the bottom, grayed out */}
        {unavailable.length > 0 && (
          <div className="pt-1">
            <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-300">Not available</p>
            {unavailable.map((o) =>
              render ? (
                <React.Fragment key={o.key}>{render(o)}</React.Fragment>
              ) : (
                <OptionRow key={o.key} label={o.label} sub={o.sub} count={0} active={false} unavailable onClick={() => undefined} />
              ),
            )}
          </div>
        )}
      </div>
      {expanded && hiddenCount === 0 && (
        <button onClick={() => setExpanded(false)} className="w-full rounded-lg py-1 text-[12px] font-semibold text-ink-400 transition hover:bg-ink-100">
          Show less
        </button>
      )}
    </div>
  );
}
