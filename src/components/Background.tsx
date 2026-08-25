export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-ink-50 via-white to-ink-50" />
      <div className="dot-grid absolute inset-x-0 top-0 h-[420px] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="animate-blob-float absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-accent-200/40 blur-3xl" />
      <div className="animate-blob-float-slow absolute -right-40 top-40 h-[480px] w-[480px] rounded-full bg-sky-200/40 blur-3xl" />
      <div className="animate-blob-float absolute bottom-[-160px] left-1/3 h-[420px] w-[520px] rounded-full bg-violet-200/30 blur-3xl" />
    </div>
  );
}
