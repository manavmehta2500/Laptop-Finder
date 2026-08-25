import { motion } from 'framer-motion';
import { Laptop, RotateCcw } from 'lucide-react';

export function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid place-items-center rounded-3xl border-2 border-dashed border-ink-200 bg-white/60 px-6 py-20 text-center"
    >
      <div className="relative">
        <span className="grid h-20 w-20 place-items-center rounded-3xl bg-ink-100 text-ink-400">
          <Laptop size={36} />
        </span>
        <motion.span
          className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-accent-500 text-white shadow-md"
          animate={{ rotate: [0, 12, -12, 0] }}
          transition={{ repeat: Infinity, duration: 2.4 }}
        >
          <RotateCcw size={14} />
        </motion.span>
      </div>
      <h3 className="mt-5 text-lg font-extrabold text-ink-900">No laptops match these filters</h3>
      <p className="mt-1 max-w-sm text-[13px] text-ink-500">
        Your combination is very specific. Loosen a filter or two — the monitor checks hundreds of offers, but this exact mix came up empty.
      </p>
      <button
        onClick={onReset}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-md transition hover:bg-accent-700"
      >
        <RotateCcw size={14} />
        Reset all filters
      </button>
    </motion.div>
  );
}
