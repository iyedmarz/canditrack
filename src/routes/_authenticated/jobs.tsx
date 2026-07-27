import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AppHeader } from "@/components/candid/AppHeader";
import { searchJobs, type JobResult } from "@/lib/jobs.functions";
import { createApplication } from "@/lib/applications.functions";
import { ExternalLink, Check, Plus, Search } from "lucide-react";

type Contract = "all" | "cdi" | "cdd" | "stage" | "alternance";
type Freshness = "all" | "1" | "7" | "30";
type Sort = "date" | "relevance";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Rechercher des offres — CandidTrack" }] }),
  component: JobsPage,
});

function JobsPage() {
  const searchFn = useServerFn(searchJobs);
  const createFn = useServerFn(createApplication);
  const navigate = useNavigate();

  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const [contract, setContract] = useState<Contract>("all");
  const [freshness, setFreshness] = useState<Freshness>("all");
  const [sort, setSort] = useState<Sort>("date");
  const [results, setResults] = useState<JobResult[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const searchMut = useMutation({
    mutationFn: (v: { what: string; where: string; contract: Contract; freshness: Freshness; sort: Sort }) =>
      searchFn({ data: { what: v.what, where: v.where, contract: v.contract, page: 1, sort: v.sort, ...(v.freshness !== "all" ? { maxDaysOld: Number(v.freshness) } : {}) } }),
    onSuccess: (r) => { setResults(r.results); setTotal(r.total); setError(null); },
    onError: (e: any) => setError(e?.message ?? "Recherche impossible"),
  });

  const addMut = useMutation({
    mutationFn: async (j: JobResult) => {
      const { id } = await createFn({
        data: {
          url: j.url,
          poste: j.title,
          societe: j.company,
          localisation: j.location,
          skills: "",
          status: "sent",
        },
      });
      return id;
    },
    onSuccess: (_id, j) => setAdded((s) => new Set(s).add(j.id)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!what.trim()) return;
    searchMut.mutate({ what: what.trim(), where: where.trim(), contract });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-4">
          <h1 className="text-lg font-semibold">Offres agrégées</h1>
          <p className="text-sm text-muted-foreground">
            LinkedIn, Welcome to the Jungle, Indeed, APEC… via Adzuna. Les offres déjà présentes dans tes candidatures sont marquées.
          </p>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_180px_140px]">
          <input
            value={what} onChange={(e) => setWhat(e.target.value)}
            placeholder="Nom de poste (ex. Développeur React)"
            className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <input
            value={where} onChange={(e) => setWhere(e.target.value)}
            placeholder="Localisation (ex. Paris, Lyon, remote)"
            className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <select
            value={contract} onChange={(e) => setContract(e.target.value as Contract)}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring"
          >
            <option value="all">Tous contrats</option>
            <option value="cdi">CDI</option>
            <option value="cdd">CDD</option>
            <option value="stage">Stage</option>
            <option value="alternance">Alternance</option>
          </select>
          <button
            type="submit" disabled={searchMut.isPending}
            className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            {searchMut.isPending ? "Recherche…" : "Rechercher"}
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-status-refused-fg">{error}</p>}

        {results.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            {results.length} offres uniques affichées (sur {total.toLocaleString("fr-FR")} au total)
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {results.map((j) => {
            const isAdded = added.has(j.id);
            const disabled = j.alreadyTracked || isAdded || addMut.isPending;
            return (
              <div key={j.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <a
                      href={j.url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium hover:underline"
                    >
                      {j.title} <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {j.company} · {j.location || "—"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-input px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {j.source}
                  </span>
                </div>
                {j.description && (
                  <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{j.description}…</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-1 text-[10px] uppercase text-muted-foreground">
                    {j.contractLabel && <span className="rounded-sm bg-muted px-1.5 py-0.5">{j.contractLabel}</span>}
                    {j.created && <span>{new Date(j.created).toLocaleDateString("fr-FR")}</span>}
                  </div>
                  {j.alreadyTracked ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5" /> Déjà suivie
                    </span>
                  ) : isAdded ? (
                    <button
                      onClick={() => navigate({ to: "/dashboard" })}
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium hover:bg-muted"
                    >
                      <Check className="h-3.5 w-3.5" /> Ajoutée — voir
                    </button>
                  ) : (
                    <button
                      onClick={() => addMut.mutate(j)}
                      disabled={disabled}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Suivre
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {results.length === 0 && !searchMut.isPending && (
          <div className="mt-10 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Lance une recherche pour découvrir des offres.
            <div className="mt-2">
              <Link to="/dashboard" className="text-primary hover:underline">← Retour au dashboard</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
