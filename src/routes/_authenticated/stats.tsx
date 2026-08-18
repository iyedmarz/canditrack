import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppHeader } from "@/components/candid/AppHeader";
import { StatCard } from "@/components/candid/StatCard";
import { listApplications } from "@/lib/applications.functions";
import { getOverview, getStatusBreakdown, getTimeline, type Granularity } from "@/lib/stats";

const q = queryOptions({ queryKey: ["applications"], queryFn: () => listApplications() });

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Statistiques de candidatures — CandidTrack" },
      {
        name: "description",
        content:
          "Taux de réponse, taux d'entretien, taux de succès, délai moyen de réponse et évolution de vos candidatures dans le temps.",
      },
      { property: "og:title", content: "Statistiques de candidatures — CandidTrack" },
      {
        property: "og:description",
        content: "Vue d'ensemble de votre recherche d'emploi : réponses, entretiens, offres et rythme d'envoi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: StatsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm">Erreur : {String(error)}</div>,
  notFoundComponent: () => <div className="p-8 text-sm">Introuvable</div>,
});

function StatsPage() {
  const { data: items } = useSuspenseQuery(q);
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [chartKind, setChartKind] = useState<"pie" | "bar">("pie");

  const o = useMemo(() => getOverview(items), [items]);
  const breakdown = useMemo(() => getStatusBreakdown(items), [items]);
  const timeline = useMemo(
    () => getTimeline(items, granularity, granularity === "week" ? 12 : 12),
    [items, granularity],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <h1 className="text-lg font-semibold">Statistiques</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Vue d'ensemble de votre recherche d'emploi.
        </p>

        {/* 1. Vue d'ensemble */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Candidatures envoyées" value={o.total} />
          <StatCard
            label="Taux de réponse"
            value={`${o.responseRate}%`}
            hint={`${o.responded} réponse${o.responded > 1 ? "s" : ""}`}
          />
          <StatCard
            label="Taux d'entretien"
            value={`${o.interviewRate}%`}
            hint={`${o.interviews} entretien${o.interviews > 1 ? "s" : ""}`}
          />
          <StatCard
            label="Taux de succès"
            value={`${o.successRate}%`}
            hint={`${o.offers} offre${o.offers > 1 ? "s" : ""}`}
          />
          <StatCard
            label="Temps de réponse moyen"
            value={o.avgResponseDays === null ? "—" : `${o.avgResponseDays} j`}
            hint={o.avgResponseDays === null ? "Aucune réponse датée" : "Envoi → 1re réponse"}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 2. Répartition par statut */}
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Répartition par statut</h2>
              <div className="flex gap-1 rounded-md border border-border p-0.5">
                {(["pie", "bar"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setChartKind(k)}
                    className={`rounded px-2 py-1 text-[11px] font-medium ${
                      chartKind === k
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {k === "pie" ? "Camembert" : "Barres"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chartKind === "pie" ? (
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={52}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {breakdown.map((s) => (
                        <Cell key={s.key} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip total={o.total} />} />
                  </PieChart>
                ) : (
                  <BarChart data={breakdown} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip total={o.total} />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {breakdown.map((s) => (
                        <Cell key={s.key} fill={s.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
              {breakdown.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate">{s.label}</span>
                  <span className="ml-auto font-medium text-foreground">{s.value}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 3. Évolution dans le temps */}
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Évolution dans le temps</h2>
              <div className="flex gap-1 rounded-md border border-border p-0.5">
                {(["week", "month"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                    className={`rounded px-2 py-1 text-[11px] font-medium ${
                      granularity === g
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g === "week" ? "Semaine" : "Mois"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-line)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--chart-line)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Candidatures envoyées par {granularity === "week" ? "semaine" : "mois"} — 12 dernières
              périodes.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: any[];
  total?: number;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const label = p.payload?.label ?? p.name;
  const value = Number(p.value ?? 0);
  const pct = total && total > 0 ? Math.round((value / total) * 100) : null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground">{label}</div>
      <div className="text-muted-foreground">
        {value} candidature{value > 1 ? "s" : ""}
        {pct !== null ? ` · ${pct}%` : ""}
      </div>
    </div>
  );
}
