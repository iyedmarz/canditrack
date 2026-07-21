import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/candid/AppHeader";
import { StatCard } from "@/components/candid/StatCard";
import { ContactPopover } from "@/components/candid/ContactPopover";
import { JournalDrawer } from "@/components/candid/JournalDrawer";
import { StatusSelect } from "@/components/candid/StatusSelect";
import {
  mockCandidatures,
  getStats,
  STATUS_LABELS,
  type Candidature,
  type CandidatureStatus,
} from "@/lib/mock-data";
import { Link as LinkIcon, Plus, Search, ArrowUpDown } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

type StatusFilter = "all" | CandidatureStatus;

function Dashboard() {
  const [items, setItems] = useState<Candidature[]>(mockCandidatures);
  const [url, setUrl] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const stats = useMemo(() => getStats(items), [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== "all") list = list.filter((c) => c.statut === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.poste.toLowerCase().includes(q) ||
          c.societe.toLowerCase().includes(q) ||
          c.localisation.toLowerCase().includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      const d = new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime();
      return sortDesc ? -d : d;
    });
    return list;
  }, [items, statusFilter, query, sortDesc]);

  const updateStatus = (id: string, s: CandidatureStatus) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, statut: s } : c)));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Candidatures
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Suivi automatique par email — mis à jour en temps réel.
            </p>
          </div>
          <Link
            to="/add"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajout manuel
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Candidatures" value={stats.total} hint="Total actif" />
          <StatCard
            label="Taux de réponse"
            value={`${stats.rate}%`}
            hint={`${stats.total - items.filter((c) => c.statut === "sent").length} sur ${stats.total}`}
          />
          <StatCard label="Entretiens" value={stats.interviews} hint="Programmés ou passés" />
          <StatCard label="Offres" value={stats.offers} hint="Reçues" />
        </div>

        {/* Action bar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-1 min-w-[280px] items-center rounded-md border border-border bg-card focus-within:border-ring">
            <LinkIcon className="ml-3 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Coller l'URL d'une offre…"
              className="flex-1 bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => setUrl("")}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Extraire et ajouter
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-card">
            <Search className="ml-3 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-56 bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
            <FilterChip
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
              label={`Tout (${items.length})`}
            />
            {(Object.keys(STATUS_LABELS) as CandidatureStatus[]).map((s) => {
              const count = items.filter((c) => c.statut === s).length;
              return (
                <FilterChip
                  key={s}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                  label={`${STATUS_LABELS[s]} (${count})`}
                />
              );
            })}
          </div>
          <button
            onClick={() => setSortDesc((v) => !v)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowUpDown className="h-3 w-3" />
            Date {sortDesc ? "↓" : "↑"}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="candid-table w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Th className="w-[180px]">
                    <span className="inline-flex items-center gap-1.5">
                      <LinkIcon className="h-3 w-3" />
                      URL
                    </span>
                  </Th>
                  <Th className="w-[200px]">Poste</Th>
                  <Th className="w-[140px]">Société</Th>
                  <Th className="w-[90px]">Date</Th>
                  <Th className="w-[140px]">Localisation</Th>
                  <Th className="w-[180px]">Skills</Th>
                  <Th className="w-[170px]">Statut</Th>
                  <Th className="w-[140px]">Contact</Th>
                  <Th className="w-[100px]">Journal</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="group transition-colors hover:bg-muted/40">
                    <Td>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-primary underline underline-offset-2 hover:opacity-80"
                        title={c.url}
                      >
                        {c.urlLabel}
                      </a>
                    </Td>
                    <Td>
                      <Link
                        to="/candidatures/$id"
                        params={{ id: c.id }}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {c.poste}
                      </Link>
                    </Td>
                    <Td className="text-foreground">{c.societe}</Td>
                    <Td className="text-muted-foreground">{c.date}</Td>
                    <Td className="text-foreground">{c.localisation}</Td>
                    <Td className="text-muted-foreground">
                      {c.skills.length ? (
                        <span className="truncate" title={c.skills.join(", ")}>
                          {c.skills.join(", ")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/70">Non spécifié</span>
                      )}
                    </Td>
                    <Td>
                      <StatusSelect value={c.statut} onChange={(s) => updateStatus(c.id, s)} />
                    </Td>
                    <Td>
                      <ContactPopover contact={c.contact} />
                    </Td>
                    <Td>
                      <JournalDrawer candidature={c} />
                    </Td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Aucune candidature ne correspond à ces filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border-b border-border px-4 py-2.5 font-medium ${className}`}>{children}</th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`max-w-0 px-4 py-3 align-middle ${className}`}>{children}</td>;
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
