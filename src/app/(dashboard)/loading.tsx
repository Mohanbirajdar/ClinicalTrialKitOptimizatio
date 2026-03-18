export default function DashboardLoading() {
  return (
    <div>
      <div className="sticky top-0 z-30 flex h-16 items-center border-b bg-background px-6">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="p-6 space-y-6">
        <div className="flex gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-36 bg-muted animate-pulse rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2 h-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    </div>
  );
}
