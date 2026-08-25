import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Cpu,
  ExternalLink,
  HardDrive,
  Laptop as LaptopIcon,
  MemoryStick,
  Monitor,
  Radio,
  Star,
  Tag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Laptop, Offer } from '../lib/types';
import type { MatchResult, OfferPriced } from '../lib/filter';
import { primaryGpu } from '../lib/filter';
import { COUNTRY_BY_CODE } from '../lib/config';

const CATEGORY_STYLE: Record<string, string> = {
  gaming: 'bg-rose-50 text-rose-600 border-rose-200',
  work: 'bg-sky-50 text-sky-600 border-sky-200',
  student: 'bg-amber-50 text-amber-600 border-amber-200',
  ultrabook: 'bg-violet-50 text-violet-600 border-violet-200',
  creator: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
  business: 'bg-teal-50 text-teal-600 border-teal-200',
};

function fmt(n: number, currency: string): string {
  return n.toLocaleString('en', { maximumFractionDigits: 0, minimumFractionDigits: 0 }) + ` ${currency}`;
}

function OfferRow({
  p,
  country,
  currency,
  best,
  compact,
  flash,
}: {
  p: OfferPriced;
  country: string;
  currency: string;
  best?: boolean;
  compact?: boolean;
  flash?: 'up' | 'down' | null;
}) {
  const o = p.offer;
  const flag = COUNTRY_BY_CODE[o.origin]?.flag ?? '';
  const rate = COUNTRY_BY_CODE[country]?.importRate ?? 0;
  const crossBorder = (COUNTRY_BY_CODE[o.origin]?.region ?? 'EU') !== (COUNTRY_BY_CODE[country]?.region ?? 'EU');

  return (
    <div
      className={clsx(
        'rounded-xl border p-3 transition-colors',
        best ? 'border-accent-200 bg-accent-50/60' : 'border-ink-100 bg-white',
        flash && 'ring-2',
        flash === 'down' && 'ring-emerald-300',
        flash === 'up' && 'ring-rose-300',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-ink-700">
          <span className="text-[14px] leading-none">{flag}</span>
          <span className="truncate">{o.site}</span>
          {best && (
            <span className="rounded-full bg-accent-500 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-white">Best</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {flash === 'down' && (
            <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-px text-[10px] font-bold text-emerald-700">
              <TrendingDown size={10} /> live
            </span>
          )}
          {flash === 'up' && (
            <span className="flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-px text-[10px] font-bold text-rose-600">
              <TrendingUp size={10} /> live
            </span>
          )}
          <span className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> In stock
          </span>
        </span>
      </div>

      <div className={clsx('mt-1.5 flex items-end justify-between gap-2', compact ? '' : '')}>
        <div className="min-w-0">
          {p.oldUser != null && (
            <span className="block text-[12px] font-medium tabular-nums text-ink-400 line-through">{fmt(p.oldUser, currency)}</span>
          )}
          <span className={clsx('block font-extrabold tabular-nums tracking-tight', p.oldUser != null ? 'text-lg text-ink-950' : 'text-lg text-ink-900')}>
            {fmt(p.baseUser, currency)}
          </span>
          {p.taxUser > 0.5 ? (
            <span className="block text-[10.5px] font-medium text-ink-500">
              + {fmt(p.taxUser, currency)} import VAT ({Math.round(rate * 100)}%)
            </span>
          ) : crossBorder && p.taxUser <= 0.5 ? (
            <span className="block text-[10.5px] font-medium text-emerald-600">no import tax</span>
          ) : null}
        </div>
        <div className="text-right">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-400">total</span>
          <span className="block text-[17px] font-extrabold tabular-nums text-accent-700">{fmt(p.total, currency)}</span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-[10.5px] text-ink-400">
          site price: {o.price.toLocaleString('en', { maximumFractionDigits: 0 })} {o.currency}
        </span>
        <a
          href={o.url}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            'group/link inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold transition-all',
            best
              ? 'bg-accent-600 text-white shadow-sm hover:bg-accent-700 hover:shadow-md'
              : 'bg-ink-100 text-ink-700 hover:bg-accent-50 hover:text-accent-700',
          )}
        >
          View deal
          <ArrowUpRight size={13} className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
        </a>
      </div>
    </div>
  );
}

function SpecItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-ink-50/80 px-2.5 py-1.5">
      <span className="shrink-0 text-ink-400">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[9px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
        <span className="block truncate text-[11.5px] font-semibold text-ink-700">{value}</span>
      </span>
    </div>
  );
}

export function LaptopCard({ result, country, flash }: { result: MatchResult; country: string; flash?: 'up' | 'down' | null }) {
  const l = result.laptop;
  const [showAll, setShowAll] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const currency = COUNTRY_BY_CODE[country].currency;
  const pg = primaryGpu(l);
  const visibleOffers = showAll ? result.offers : result.offers.slice(0, 1);
  const topDiscount = Math.max(...result.offers.map((o) => o.discount));

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      whileHover={{ y: -4 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover"
    >
      {/* image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-ink-50 via-white to-ink-100/70">
        {!imgFailed ? (
          <img
            src={l.image}
            alt={l.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <div className="text-center">
              <LaptopIcon size={44} className="mx-auto text-ink-200" />
              <p className="mt-1 text-[11px] font-bold tracking-wide text-ink-300">{l.brand.toUpperCase()}</p>
            </div>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {topDiscount > 0 && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 rounded-full bg-rose-500 px-2 py-1 text-[11px] font-extrabold text-white shadow-md"
            >
              <Tag size={11} strokeWidth={3} /> −{topDiscount}%
            </motion.span>
          )}
          <span className={clsx('rounded-full border bg-white/90 px-2 py-1 text-[10.5px] font-bold capitalize backdrop-blur', CATEGORY_STYLE[l.category])}>
            {l.category}
          </span>
        </div>
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10.5px] font-bold text-emerald-700 shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-500" /> In stock
        </span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent-600">
              {l.brand} · {l.line}
            </p>
            <span className="flex items-center gap-1 text-[11.5px] font-bold text-ink-600">
              <Star size={12} className="fill-amber-400 text-amber-400" /> {l.rating.toFixed(1)}
            </span>
          </div>
          <h3 className="mt-0.5 truncate text-[15px] font-extrabold tracking-tight text-ink-950">{l.name}</h3>
          <p className="mt-1 truncate text-[12px] font-medium text-ink-500">
            {l.cpu.name} · {pg.name}
            {pg.vramGB ? ` ${pg.vramGB}GB` : ''} · {l.ram.sizeGB}GB {l.ram.type} · {l.storage.sizeGB >= 1024 ? `${l.storage.sizeGB / 1024}TB` : `${l.storage.sizeGB}GB`} · {l.display.sizeInches}{"″"} {l.display.resLabel} {l.display.refreshHz}Hz
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <SpecItem icon={<Cpu size={13} />} label="CPU" value={`${l.cpu.name} · ${l.cpu.cores}C`} />
          <SpecItem icon={<Monitor size={13} />} label="GPU" value={pg.vramGB ? `${pg.name} · ${pg.vramGB}GB` : pg.name} />
          <SpecItem icon={<MemoryStick size={13} />} label="RAM" value={`${l.ram.sizeGB}GB ${l.ram.type}${l.ram.speedMTs ? ` ${l.ram.speedMTs}` : ''}${l.ram.config !== `${l.ram.sizeGB}GB` ? ` · ${l.ram.config}` : ''}${l.ram.upgradeable ? ' · upg.' : ''}`} />
          <SpecItem icon={<HardDrive size={13} />} label="Storage" value={`${l.storage.sizeGB >= 1024 ? `${l.storage.sizeGB / 1024}TB` : `${l.storage.sizeGB}GB`} ${l.storage.type}`} />
          <SpecItem icon={<Monitor size={13} />} label="Display" value={`${l.display.sizeInches}″ ${l.display.width}×${l.display.height} ${l.display.panel} ${l.display.refreshHz}Hz${l.display.touch ? ' · touch' : ''}`} />
          <SpecItem icon={<Radio size={13} />} label="System" value={`${l.os} · ${l.wifi} · ${l.layouts.length} layouts`} />
        </div>

        {/* offers */}
        <div className="mt-auto space-y-2 border-t border-ink-100 pt-3">
          {visibleOffers.map((p, i) => (
            <OfferRow key={p.offer.id} p={p} country={country} currency={currency} best={i === 0} flash={i === 0 ? flash : null} />
          ))}
          {result.offers.length > 1 && (
            <button
              onClick={() => setShowAll((s) => !s)}
              className="flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[11.5px] font-bold text-accent-600 transition hover:bg-accent-50"
            >
              {showAll ? 'Show less' : `+ ${result.offers.length - 1} more offer${result.offers.length - 1 > 1 ? 's' : ''}`}
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
