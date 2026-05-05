/**
 * Shown by PersistGate while redux-persist reads localStorage.
 * Must match the 3-panel layout dimensions so there's no layout shift
 * when the real app mounts.
 */
export function FormBuilderSkeleton() {
  return (
    <div className="flex flex-col h-dvh bg-[#FAFAF8]">
      {/* Header skeleton */}
      <div className="h-14 border-b border-[var(--color-border)] bg-white flex items-center px-4 gap-4 shrink-0">
        <div className="h-5 w-28 rounded bg-[var(--color-stone-200)] animate-pulse" />
        <div className="h-5 w-40 rounded bg-[var(--color-stone-200)] animate-pulse mx-auto" />
        <div className="h-8 w-20 rounded-md bg-[var(--color-stone-200)] animate-pulse" />
        <div className="h-8 w-20 rounded-md bg-[var(--color-stone-200)] animate-pulse" />
      </div>

      {/* 3-panel body skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-60 shrink-0 border-r border-[var(--color-border)] bg-white p-3 flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-9 rounded-md bg-[var(--color-stone-100)] animate-pulse"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>

        {/* Centre canvas */}
        <div className="flex-1 bg-[var(--color-stone-50)] p-6 flex flex-col gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-white border border-[var(--color-border)] animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 border-l border-[var(--color-border)] bg-white p-4 flex flex-col gap-3">
          <div className="h-8 w-full rounded-md bg-[var(--color-stone-100)] animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-[var(--color-stone-200)] animate-pulse" />
          <div className="h-10 w-full rounded-md bg-[var(--color-stone-100)] animate-pulse mt-2" />
          <div className="h-10 w-full rounded-md bg-[var(--color-stone-100)] animate-pulse" />
          <div className="h-10 w-full rounded-md bg-[var(--color-stone-100)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
