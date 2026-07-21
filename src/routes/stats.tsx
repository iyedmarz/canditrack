import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/candid/AppHeader";
import { StatCard } from "@/components/candid/StatCard";
import { mockCandidatures, getStats } from "@/lib/mock-data";
import { useMemo } from "react";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistiques — CandidTrack" },
      {
        name: "description",
        content:
          "Vos statistiques de recherche d'emploi : candidatures par semaine, taux de réponse, temps de réponse moyen.",
      },
      { property: "og:title", content: "Statistiques — CandidTrack" },
      {
        property: "og:description",
        content: "Visualisez la progression de votre recherche d'emploi avec CandidTrack.",
      },
    ],
  }),
  component: Stats,
});

function Stats() {
  const items = mockCandidatures;
  const stats = getStats(items);

  // candidatures par semaine (basé sur dateISO)
  const weekly = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((c) => {
      const d = new Date(c.dateISO);
      // début de semaine (lundi)
      const day = (d.getDay() + 6) % 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - day);
      const key = monday.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ week: k, count: v }));
  }, [items]);

  const max = Math.max(1, ...weekly.map((w) => w.count));

  // temps de réponse moyen par société (jours entre 1re et 2e entrée)
  const responseTimes = useMemo(() => {
    return items
      .map((c) => {
        const sorted = [...c.journal].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        if (sorted.length < 2) return null;
        const diffMs =
          new Date(sorted[1].date).getTime() - new Date(sorted[0].date).getTime();
        return { societe: c.societe, days: Math.max(1, Math.round(diffMs / 86400000)) };
      })
      .filter((x): x is { societe: string; days: number } => !!x)
      .sort((a, b) => a.days - b.days);
  }, [items]);

  const avgDays =
    responseTimes.length === 0
      ? 0
      : Math.round(
          responseTimes.reduce((s, r) => s + r.days, 0) / responseTimes.length,
        );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Statistiques</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Vue d'ensemble de votre recherche.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Candidatures" value={stats.total} />
          <StatCard label="Taux de réponse" value={`${stats.rate}%`} />
          <StatCard label="Entretiens" value={stats.interviews} />
          <StatCard label="Délai moyen" value={`${avgDays}j`} hint="1re réponse reçue" />
        </div>

        <section className="mt-6 rounded-md border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Candidatures par semaine</h2>
          <div className="mt-6 flex h-40 items-end gap-3">
            {weekly.map((w) => (
              <div key={w.week} className="flex flex-1 flex-col items-center gap-2">
                <div className="text-xs font-medium text-foreground">{w.count}</div>
                <div
                  className="w-full rounded-t-sm bg-primary/85"
                  style={{ height: `${(w.count / max) * 100}%` }}
                />
                <div className="text-[10px] text-muted-foreground">
                  {new Date(w.week).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-md border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Temps de réponse par entreprise
          </h2>
          <div className="mt-4 space-y-2.5">
            {responseTimes.map((r) => {
              const pct = Math.min(100, (r.days / Math.max(1, ...responseTimes.map((x) => x.days))) * 100);
              return (
                <div key={r.societe} className="grid grid-cols-[140px_1fr_60px] items-center gap-3">
                  <div className="truncate text-sm text-foreground">{r.societe}</div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-right text-xs tabular-nums text-muted-foreground">
                    {r.days}j
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
