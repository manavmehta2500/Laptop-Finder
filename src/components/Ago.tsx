import { useEffect, useState } from 'react';

/** Renders "Ns ago" and ticks locally — keeps the parent out of the 1s render loop. */
export function Ago({ ts }: { ts: number | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (ts == null) return <span>connecting…</span>;
  return <span>{Math.max(0, Math.floor((Date.now() - ts) / 1000))}s ago</span>;
}
