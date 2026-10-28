export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-sunk" />
      <div className="h-40 animate-pulse rounded-card bg-sunk" />
    </div>
  );
}
