import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Radio, Tag, TrendingDown, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import type { PriceEventType } from '../lib/types';

export interface Toast {
  id: number;
  type: PriceEventType;
  message: string;
}

const STYLE: Record<PriceEventType, { icon: React.ReactNode; ring: string; iconBg: string; title: string }> = {
  'discount-start': { icon: <Tag size={15} />, ring: 'border-rose-200', iconBg: 'bg-rose-100 text-rose-600', title: 'Deal started' },
  'discount-end': { icon: <Ban size={15} />, ring: 'border-ink-200', iconBg: 'bg-ink-100 text-ink-500', title: 'Deal ended' },
  'price-drop': { icon: <TrendingDown size={15} />, ring: 'border-emerald-200', iconBg: 'bg-emerald-100 text-emerald-600', title: 'Price dropped' },
  'price-rise': { icon: <TrendingUp size={15} />, ring: 'border-amber-200', iconBg: 'bg-amber-100 text-amber-600', title: 'Price changed' },
};

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = STYLE[t.type];
          return (
            <motion.button
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={() => onDismiss(t.id)}
              className={clsx('pointer-events-auto flex items-start gap-2.5 rounded-2xl border bg-white/95 p-3 text-left shadow-xl backdrop-blur', s.ring)}
            >
              <span className={clsx('grid h-8 w-8 shrink-0 place-items-center rounded-xl', s.iconBg)}>{s.icon}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                  <Radio size={10} className="text-emerald-500" /> {s.title}
                </span>
                <span className="mt-0.5 block text-[12.5px] font-medium leading-snug text-ink-800">{t.message}</span>
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
