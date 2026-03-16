export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-4 py-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
