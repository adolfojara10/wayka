/**
 * Loading skeleton for a catalog category route. Shown by Next.js's
 * loading.tsx convention while the server fetches data.
 *
 * Deliberately quiet: 6 placeholder cards in the same grid the real
 * page uses, so the layout doesn't shift when content arrives.
 */

interface CategoryLoadingSkeletonProps {
  title: string;
}

export function CategoryLoadingSkeleton({ title }: CategoryLoadingSkeletonProps) {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <div className="bg-foreground/10 mt-3 h-4 w-full max-w-md animate-pulse rounded" />
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-foreground/10 bg-background h-56 animate-pulse rounded-2xl border p-5"
          />
        ))}
      </div>
    </>
  );
}
