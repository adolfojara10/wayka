export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="bg-foreground/10 mb-4 h-4 w-64 animate-pulse rounded" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="border-foreground/10 bg-foreground/5 aspect-square animate-pulse rounded-2xl border" />
        <div>
          <div className="bg-foreground/10 h-10 w-3/4 animate-pulse rounded" />
          <div className="bg-foreground/10 mt-4 h-4 w-full animate-pulse rounded" />
          <div className="bg-foreground/10 mt-2 h-4 w-5/6 animate-pulse rounded" />
          <div className="bg-foreground/10 mt-6 h-8 w-32 animate-pulse rounded" />
          <div className="bg-foreground/10 mt-8 h-11 w-40 animate-pulse rounded-full" />
        </div>
      </div>
    </section>
  );
}
