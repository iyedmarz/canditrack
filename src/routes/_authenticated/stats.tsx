import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/candid/AppHeader";
import { StatCard } from "@/components/candid/StatCard";
import { listApplications } from "@/lib/applications.functions";
import { getStats } from "@/lib/mock-data";

const q = queryOptions({ queryKey: ["applications"], queryFn: () => listApplications() });

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({ meta: [{ title: "Statistiques — CandidTrack" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: StatsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm">Erreur : {String(error)}</div>,
  notFoundComponent: () => <div className="p-8 text-sm">Introuvable</div>,
});

function StatsPage() {
  const { data: items } = useSuspenseQuery(q);
  const s = getStats(items);

  // weekly volume (last 8 weeks)
  const buckets: Record<string, number> = {};
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i * 7);
    const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets[key] = 0;
  }
  const keys = Object.keys(buckets);
  items.forEach((c) => {
    const d = new Date(c.dateISO);
    const weeksAgo = Math.floor((now.getTime() - d.getTime()) / (7 * 24 * 3600 * 1000));
    if (weeksAgo >= 0 && weeksAgo < 8) {
      const k = keys[keys.length - 1 - weeksAgo];
      buckets[k] = (buckets[k] ?? 0) + 1;
    }
  });
  const max = Math.max(1, ...Object.values(buckets));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <h1 className="text-lg font-semibold">Statistiques</h1>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Candidatures" value={String(s.total)} />
          <StatCard label="Taux de réponse" value={`${s.rate}%`} />
          <StatCard label="Entretiens / offres" value={String(s.interviews)} />
          <StatCard label="Offres reçues" value={String(s.offers)} />
        </div>
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Candidatures par semaine</h2>
          <div className="mt-4 flex items-end gap-2 h-40">
            {keys.map((k) => (
              <div key={k} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${(buckets[k] / max) * 100}%` }}
                  title={`${buckets[k]}`}
                />
                <span className="text-[10px] text-muted-foreground">{k}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
