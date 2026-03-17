import { Card, CardContent } from '@/components/ui/card';

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-white/60">{label}</p>
      </CardContent>
    </Card>
  );
}
