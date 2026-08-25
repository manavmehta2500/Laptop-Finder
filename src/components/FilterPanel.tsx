import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  MousePointerClick,
  Percent,
  Cpu,
  MemoryStick,
  MonitorSmartphone,
  BadgeCheck,
  Monitor,
  Keyboard,
  Plane,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Filters, Facets } from '../lib/filter';
import { RAM_SPEEDS_BY_TYPE } from '../lib/filter';
import { COUNTRY_BY_CODE } from '../lib/config';
import { Chip, DualSlider, FilterSection, OptionList, OptionRow, OptionSearch, Toggle } from './primitives';

const DISCOUNT_DOMAIN: [number, number] = [0, 40];
const REFRESH_DOMAIN: [number, number] = [60, 240];
const SCREEN_DOMAIN: [number, number] = [13, 17];

export interface FilterPanelProps {
  filters: Filters;
  patch: (p: Partial<Filters>) => void;
  facets: Facets;
  country: string;
  budgetDomain: [number, number];
  onReset: () => void;
  activeTotal: number;
}

function toggleIn<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export default function FilterPanel({ filters: f, patch, facets, country, budgetDomain, onReset, activeTotal }: FilterPanelProps) {
  const [gpuSearch, setGpuSearch] = useState('');
  const [cpuSearch, setCpuSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [brandExpanded, setBrandExpanded] = useState(false);
  const [openLines, setOpenLines] = useState<Record<string, boolean>>({});

  const destCurrency = COUNTRY_BY_CODE[country].currency;

  const discountActive = f.discountRange[0] !== DISCOUNT_DOMAIN[0] || f.discountRange[1] !== DISCOUNT_DOMAIN[1];
  const refreshActive = f.refresh[0] !== REFRESH_DOMAIN[0] || f.refresh[1] !== REFRESH_DOMAIN[1];
  const screenActive = f.screenSize[0] !== SCREEN_DOMAIN[0] || f.screenSize[1] !== SCREEN_DOMAIN[1];
  const budgetActive = f.budget != null;

  // RAM speed options depend on the selected memory type(s)
  const speedOptions = useMemo(() => {
    const types = (f.ramTypes.length ? f.ramTypes : ['DDR4', 'DDR5', 'LPDDR4x', 'LPDDR5', 'LPDDR5x']) as import('../lib/types').RamType[];
    const allowed = new Set<number>();
    for (const t of types) for (const s of RAM_SPEEDS_BY_TYPE[t]) allowed.add(s);
    return facets.ramSpeed.filter((o) => allowed.has(o.payload));
  }, [f.ramTypes, facets.ramSpeed]);

  const brandOptions = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return facets.brands;
    return facets.brands
      .filter((b) => b.label.toLowerCase().includes(q) || b.lines.some((l) => l.label.toLowerCase().includes(q)))
      .map((b) => ({ ...b, lines: b.lines.filter((l) => l.label.toLowerCase().includes(q) || b.label.toLowerCase().includes(q)) }));
  }, [facets.brands, brandSearch]);

  const visibleBrands = brandExpanded ? brandOptions : brandOptions.slice(0, 8);
  const hiddenBrands = brandOptions.length - visibleBrands.length;

  const lineCounts = useMemo(() => {
    const m = new Map<string, { count: number; active: boolean }>();
    for (const b of facets.brands) for (const l of b.lines) m.set(l.key, { count: l.count, active: l.active });
    return m;
  }, [facets.brands]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white/90 shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
        <span className="flex items-center gap-2 text-[13.5px] font-bold text-ink-900">
          <SlidersHorizontal size={15} className="text-accent-600" />
          Filters
          {activeTotal > 0 && (
            <motion.span
              key={activeTotal}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white"
            >
              {activeTotal}
            </motion.span>
          )}
        </span>
        {activeTotal > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-semibold text-accent-600 transition hover:bg-accent-50"
          >
            <RotateCcw size={12} />
            Reset all
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* ── Budget ── */}
        <FilterSection title="Budget" icon={<Wallet size={14} />} activeCount={budgetActive ? 1 : 0} defaultOpen>
          <DualSlider
            min={budgetDomain[0]}
            max={budgetDomain[1]}
            step={25}
            value={f.budget ?? budgetDomain}
            onChange={(v) => patch({ budget: v })}
            format={(n) => `${Math.round(n)}`}
            isAny={budgetActive ? false : true}
            onAny={() => patch({ budget: null })}
            label={`Total incl. import tax · ${destCurrency}`}
          />
          <p className="text-[10.5px] leading-snug text-ink-400">
            What you actually pay after currency conversion {COUNTRY_BY_CODE[country].importRate > 0 && '+ import VAT/duty'}.
          </p>
        </FilterSection>

        {/* ── Use ── */}
        <FilterSection title="Use" icon={<MousePointerClick size={14} />} activeCount={f.use.length} defaultOpen>
          <div className="flex flex-wrap gap-1.5">
            {facets.use.map((o) => (
              <Chip key={o.key} label={o.label} count={o.count} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ use: toggleIn(f.use, o.payload) })} />
            ))}
          </div>
        </FilterSection>

        {/* ── Deals & rules ── */}
        <FilterSection
          title="Deals & rules"
          icon={<Percent size={14} />}
          activeCount={(discountActive ? 1 : 0) + (f.discountOnly ? 1 : 0) + (f.dutyFreeOnly ? 1 : 0)}
          defaultOpen
        >
          <DualSlider
            min={DISCOUNT_DOMAIN[0]}
            max={DISCOUNT_DOMAIN[1]}
            step={1}
            value={f.discountRange}
            onChange={(v) => patch({ discountRange: v })}
            format={(n) => `${n}%`}
            isAny={!discountActive}
            onAny={() => patch({ discountRange: [DISCOUNT_DOMAIN[0], DISCOUNT_DOMAIN[1]] })}
            label="Discount depth"
          />
          <Toggle checked={f.discountOnly} onChange={(v) => patch({ discountOnly: v })} label="Discounts only" hint="Hide offers at full price" />
          <Toggle
            checked={f.dutyFreeOnly}
            onChange={(v) => patch({ dutyFreeOnly: v })}
            label={`Duty-free to ${COUNTRY_BY_CODE[country].name}`}
            hint="Only offers that arrive without import tax"
          />
        </FilterSection>

        {/* ── GPU ── */}
        <FilterSection
          title="Graphics (GPU)"
          icon={<Monitor size={14} />}
          activeCount={f.gpuVendors.length + (f.minVram != null ? 1 : 0) + f.gpus.length}
          defaultOpen
        >
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Vendor</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.gpuVendor.map((o) => (
                <Chip key={o.key} label={o.label} count={o.count} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ gpuVendors: toggleIn(f.gpuVendors, o.payload) })} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Min VRAM</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.minVram.map((o) => (
                <Chip key={o.key} label={o.label} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ minVram: o.payload })} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">GPU</p>
            <OptionList
              options={facets.gpu}
              searchValue={gpuSearch}
              onSearch={setGpuSearch}
              searchPlaceholder="Search GPU…"
              visible={5}
              toggle={(key) => patch({ gpus: toggleIn(f.gpus, key) })}
            />
            <p className="text-[10.5px] leading-snug text-ink-400">
              Integrated GPUs only match laptops where they are the main GPU.
            </p>
          </div>
        </FilterSection>

        {/* ── CPU ── */}
        <FilterSection
          title="Processor (CPU)"
          icon={<Cpu size={14} />}
          activeCount={f.cpuVendors.length + (f.minCores != null ? 1 : 0) + f.cpus.length}
        >
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Vendor</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.cpuVendor.map((o) => (
                <Chip key={o.key} label={o.label} count={o.count} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ cpuVendors: toggleIn(f.cpuVendors, o.payload) })} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Min cores</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.minCores.map((o) => (
                <Chip key={o.key} label={o.label} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ minCores: o.payload })} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">CPU</p>
            <OptionList
              options={facets.cpu}
              searchValue={cpuSearch}
              onSearch={setCpuSearch}
              searchPlaceholder="Search CPU…"
              visible={5}
              toggle={(key) => patch({ cpus: toggleIn(f.cpus, key) })}
            />
          </div>
        </FilterSection>

        {/* ── Memory & storage ── */}
        <FilterSection
          title="Memory & storage"
          icon={<MemoryStick size={14} />}
          activeCount={
            f.ramTypes.length +
            (f.minRam != null ? 1 : 0) +
            f.ramConfigs.length +
            f.ramSpeeds.length +
            (f.upgradeableOnly ? 1 : 0) +
            (f.minStorage != null ? 1 : 0)
          }
        >
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Memory type</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.ramType.map((o) => (
                <Chip key={o.key} label={o.label} count={o.count} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ ramTypes: toggleIn(f.ramTypes, o.payload), ramSpeeds: [] })} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Min RAM</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.minRam.map((o) => (
                <Chip key={o.key} label={o.label} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ minRam: o.payload })} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">RAM configuration</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.ramConfig.map((o) => (
                <Chip key={o.key} label={o.label} count={o.count} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ ramConfigs: toggleIn(f.ramConfigs, o.payload) })} />
              ))}
            </div>
          </div>
          {speedOptions.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Speed {f.ramTypes.length === 1 && <span className="normal-case text-ink-300">· {f.ramTypes[0]}</span>}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {speedOptions.map((o) => (
                  <Chip key={o.key} label={o.label} count={o.count} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ ramSpeeds: toggleIn(f.ramSpeeds, o.payload) })} />
                ))}
              </div>
            </div>
          )}
          <Toggle checked={f.upgradeableOnly} onChange={(v) => patch({ upgradeableOnly: v })} label="Upgradeable RAM only" hint="Off = show everything, on = only user-replaceable RAM" />
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Min storage</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.minStorage.map((o) => (
                <Chip key={o.key} label={o.label} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ minStorage: o.payload })} />
              ))}
            </div>
          </div>
        </FilterSection>

        {/* ── Display ── */}
        <FilterSection
          title="Display"
          icon={<MonitorSmartphone size={14} />}
          activeCount={
            f.resolutions.length +
            (refreshActive ? 1 : 0) +
            f.panels.length +
            f.aspects.length +
            (f.touch !== 'any' ? 1 : 0) +
            (screenActive ? 1 : 0)
          }
        >
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Resolution</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.resolution.map((o) => (
                <Chip key={o.key} label={o.label} count={o.count} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ resolutions: toggleIn(f.resolutions, o.payload) })} />
              ))}
            </div>
          </div>
          <DualSlider
            min={REFRESH_DOMAIN[0]}
            max={REFRESH_DOMAIN[1]}
            step={5}
            value={f.refresh}
            onChange={(v) => patch({ refresh: v })}
            format={(n) => `${n}Hz`}
            isAny={!refreshActive}
            onAny={() => patch({ refresh: [REFRESH_DOMAIN[0], REFRESH_DOMAIN[1]] })}
            label="Refresh rate"
          />
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Panel</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.panel.map((o) => (
                <Chip key={o.key} label={o.label} count={o.count} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ panels: toggleIn(f.panels, o.payload) })} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Aspect ratio</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.aspect.map((o) => (
                <Chip key={o.key} label={o.label} count={o.count} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ aspects: toggleIn(f.aspects, o.payload) })} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Touch screen</p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['any', 'Any'],
                  ['yes', 'Yes'],
                  ['no', 'No'],
                ] as const
              ).map(([v, label]) => (
                <Chip key={v} label={label} active={f.touch === v} onClick={() => patch({ touch: v })} />
              ))}
            </div>
          </div>
          <DualSlider
            min={SCREEN_DOMAIN[0]}
            max={SCREEN_DOMAIN[1]}
            step={0.1}
            value={f.screenSize}
            onChange={(v) => patch({ screenSize: v })}
            format={(n) => `${n}"`}
            isAny={!screenActive}
            onAny={() => patch({ screenSize: [SCREEN_DOMAIN[0], SCREEN_DOMAIN[1]] })}
            label="Screen size (inches)"
          />
        </FilterSection>

        {/* ── Brand ─ */}
        <FilterSection title="Brand & family" icon={<BadgeCheck size={14} />} activeCount={f.brands.length + f.lines.length}>
          <OptionSearch value={brandSearch} onChange={setBrandSearch} placeholder="Search brand or family…" />
          <div className="max-h-[300px] space-y-0.5 overflow-y-auto pr-1">
            {visibleBrands.map((b) => {
              const linesOpen = openLines[b.key];
              return (
                <div key={b.key}>
                  <div className="flex items-center">
                    <div className={clsx('min-w-0 flex-1', b.count === 0 && !b.active && 'opacity-45')}>
                      <OptionRow
                        label={b.label}
                        count={b.count}
                        active={b.active}
                        unavailable={b.count === 0 && !b.active}
                        onClick={() => {
                          if (b.count === 0 && !b.active) return;
                          patch({ brands: toggleIn(f.brands, b.payload), lines: f.brands.includes(b.payload) ? [] : f.lines.filter((l) => !b.lines.some((x) => x.label === l)) });
                        }}
                      />
                    </div>
                    {b.lines.length > 0 && b.count > 0 && (
                      <button
                        onClick={() => setOpenLines((s) => ({ ...s, [b.key]: !s[b.key] }))}
                        className="mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                        title="Choose specific families"
                      >
                        <svg viewBox="0 0 24 24" className={clsx('h-3.5 w-3.5 transition-transform', linesOpen && 'rotate-90')} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="m9 6 6 6-6 6" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {linesOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="ml-6 mt-0.5 space-y-0.5 border-l border-ink-100 pl-2">
                      {b.lines.map((l) => {
                        const lc = lineCounts.get(l.key) ?? { count: l.count, active: l.active };
                        return (
                          <OptionRow key={l.key} label={l.label} count={lc.count} active={lc.active} unavailable={lc.count === 0 && !lc.active} onClick={() => patch({ lines: toggleIn(f.lines, l.label) })} />
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              );
            })}
            {hiddenBrands > 0 && (
              <button onClick={() => setBrandExpanded(true)} className="w-full rounded-lg py-1.5 text-[12px] font-semibold text-accent-600 transition hover:bg-accent-50">
                See more brands ({hiddenBrands})
              </button>
            )}
            {brandExpanded && hiddenBrands === 0 && (
              <button onClick={() => setBrandExpanded(false)} className="w-full rounded-lg py-1 text-[12px] font-semibold text-ink-400 transition hover:bg-ink-100">
                Show less
              </button>
            )}
          </div>
          <p className="text-[10.5px] leading-snug text-ink-400">Click a brand to select all its families, or expand it to pick one (e.g. Legion vs LOQ).</p>
        </FilterSection>

        {/* ── System & layout ── */}
        <FilterSection title="System & layout" icon={<Keyboard size={14} />} activeCount={f.oses.length + f.layouts.length + (f.minWifi != null ? 1 : 0)}>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Operating system</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.os.map((o) => (
                <Chip key={o.key} label={o.label} count={o.count} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ oses: toggleIn(f.oses, o.payload) })} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Keyboard layout</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.layout.map((o) => (
                <Chip key={o.key} label={o.label} count={o.count} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ layouts: toggleIn(f.layouts, o.payload) })} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Wi-Fi (at least)</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.minWifi.map((o) => (
                <Chip key={o.key} label={o.label} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ minWifi: o.payload })} />
              ))}
            </div>
          </div>
        </FilterSection>

        {/* ── Ships from & currency ── */}
        <FilterSection title="Ships from & currency" icon={<Plane size={14} />} activeCount={f.origins.length + f.currencies.length}>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Ships from</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.origin.map((o) => (
                <Chip key={o.key} label={`${o.sub ?? ''} ${o.label}`} active={o.active} disabled={o.count === 0 && !o.active} count={o.count} onClick={() => patch({ origins: toggleIn(f.origins, o.payload) })} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Offer currency</p>
            <div className="flex flex-wrap gap-1.5">
              {facets.currency.map((o) => (
                <Chip key={o.key} label={o.label} count={o.count} active={o.active} disabled={o.count === 0 && !o.active} onClick={() => patch({ currencies: toggleIn(f.currencies, o.payload) })} />
              ))}
            </div>
          </div>
        </FilterSection>
      </div>
    </div>
  );
}
