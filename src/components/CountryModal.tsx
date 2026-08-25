import { AnimatePresence, motion } from 'framer-motion';
import { Check, MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { COUNTRIES } from '../lib/config';

export function CountryModal({ open, chosen, onPick }: { open: boolean; chosen: string | null; onPick: (code: string) => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/40 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="w-full max-w-2xl rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-1 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-glow">
                <MapPin size={20} />
              </span>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-ink-950">Where are you shopping from?</h2>
                <p className="text-[13px] text-ink-500">
                  We convert every offer into your currency and add the exact import tax for {''}
                  cross-border orders — so the total you see is the total you pay.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {COUNTRIES.map((c, i) => {
                const active = chosen === c.code;
                return (
                  <motion.button
                    key={c.code}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i, duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onPick(c.code)}
                    className={clsx(
                      'relative rounded-2xl border-2 p-3.5 text-left transition-colors',
                      active ? 'border-accent-500 bg-accent-50' : 'border-ink-100 bg-white hover:border-accent-300 hover:bg-accent-50/50',
                    )}
                  >
                    <span className="block text-[26px] leading-none">{c.flag}</span>
                    <span className="mt-2 block text-[13.5px] font-bold text-ink-900">{c.name}</span>
                    <span className="block text-[11px] font-medium text-ink-400">
                      {c.currency}
                      {c.vatLabel ? ` · ${c.vatLabel}` : ' · no import tax'}
                    </span>
                    {active && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-accent-500 text-white"
                      >
                        <Check size={12} strokeWidth={3} />
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <p className="mt-5 text-center text-[11.5px] leading-relaxed text-ink-400">
              You can change this anytime from the top-right corner. Prices inside the EU ship between EU countries without extra import tax.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
