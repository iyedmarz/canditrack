import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/candid/AppHeader";
import { StatCard } from "@/components/candid/StatCard";
import { StatusSelect } from "@/components/candid/StatusSelect";
import { ContactPopover } from "@/components/candid/ContactPopover";
import { JournalDrawer } from "@/components/candid/JournalDrawer";
import { getStats, type Candidature, type CandidatureStatus } from "@/lib/mock-data";
import {
  listApplications,
  updateApplicationStatus,
  deleteApplication,
  createApplication,
} from "@/lib/applications.functions";
import { extractFromUrl } from "@/lib/extract.functions";
import { ExternalLink, Trash2, CheckSquare, X } from "lucide-react";

const applicationsQuery = queryOptions({
  queryKey: ["applications"],
  queryFn: () => listApplications(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Mes candidatures — CandidTrack" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(applicationsQuery),
  component: Dashboard,
  errorComponent: ({ error }) => <div className="p-8 text-sm">Erreur : {String(error)}</div>,
  notFoundComponent: () => <div className="p-8 text-sm">Introuvable</div>,
});

function Dashboard() {
  const { data: items } = useSuspenseQuery(applicationsQuery);
  const qc = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | CandidatureStatus>("all");
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  const extractFn = useServerFn(extractFromUrl);
  const createFn = useServerFn(createApplication);
  const updateFn = useServerFn(updateApplicationStatus);
  const deleteFn = useServerFn(deleteApplication);

  const stats = useMemo(() => getStats(items), [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (filter !== "all" && c.statut !== filter) return false;
      if (!q) return true;
      return [c.poste, c.societe, c.localisation, ...c.skills].some((v) =>
        String(v).toLowerCase().includes(q),
      );
    });
  }, [items, query, filter]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["applications"] });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: CandidatureStatus }) => updateFn({ data: v }),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: invalidate,
  });

  const submitExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null); setExtracting(true);
    try {
      const info = await extractFn({ data: { url: url.trim() } });
      const { id } = await createFn({
        data: {
          url: url.trim(),
          poste: info.poste,
          societe: info.societe,
          localisation: info.localisation,
          skills: info.skills.join(", "),
          status: "sent",
        },
      });
      setUrl("");
      invalidate();
      navigate({ to: "/candidatures/$id", params: { id } });
    } catch (err: any) {
      setError(err?.message ?? "Extraction impossible");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Candidatures" value={String(stats.total)} />
          <StatCard label="Taux de réponse" value={`${stats.rate}%`} />
          <StatCard label="Entretiens / offres" value={String(stats.interviews)} />
          <StatCard label="Offres reçues" value={String(stats.offers)} />
        </div>

        <form onSubmit={submitExtract} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="Coller l'URL d'une offre…"
            className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <button
            type="submit" disabled={extracting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {extracting ? "Extraction…" : "+ Extraire et ajouter"}
          </button>
          <Link
            to="/add"
            className="rounded-md border border-input bg-card px-4 py-2 text-sm font-medium hover:bg-muted text-center"
          >
            Ajouter manuellement
          </Link>
          <Link
            to="/import"
            className="rounded-md border border-input bg-card px-4 py-2 text-sm font-medium hover:bg-muted text-center"
          >
            Importer CSV
          </Link>
        </form>
        {error && <p className="mt-2 text-xs text-status-refused-fg">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-64 rounded-md border border-input bg-card px-3 py-1.5 text-sm outline-none focus:border-ring"
          />
          <div className="flex gap-1">
            {(["all", "sent", "ack", "interview", "offer", "refused"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md border px-2.5 py-1 text-xs ${
                  filter === f ? "border-primary text-primary" : "border-input text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "Tous" : f}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {selectMode ? (
              <>
                <span className="text-xs text-muted-foreground">
                  {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => {
                    if (selected.size === 0) return;
                    if (!confirm(`Supprimer ${selected.size} candidature(s) ?`)) return;
                    const ids = Array.from(selected);
                    Promise.all(ids.map((id) => deleteFn({ data: { id } })))
                      .then(() => { exitSelectMode(); invalidate(); });
                  }}
                  disabled={selected.size === 0}
                  className="inline-flex items-center gap-1 rounded-md bg-status-refused-fg px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer la sélection
                </button>
                <button
                  onClick={exitSelectMode}
                  className="inline-flex items-center gap-1 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" /> Annuler
                </button>
              </>
            ) : (
              <button
                onClick={() => setSelectMode(true)}
                className="inline-flex items-center gap-1 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <CheckSquare className="h-3.5 w-3.5" /> Sélectionner
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                {selectMode && (
                  <th className="w-10 px-4 py-2">
                    <input
                      type="checkbox"
                      aria-label="Tout sélectionner"
                      checked={filtered.length > 0 && filtered.every((c) => selected.has(c.id))}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(new Set(filtered.map((c) => c.id)));
                        else setSelected(new Set());
                      }}
                    />
                  </th>
                )}
                <th className="px-4 py-2 font-medium">URL</th>
                <th className="px-4 py-2 font-medium">Poste</th>
                <th className="px-4 py-2 font-medium">Société</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Localisation</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Journal</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/30 ${selectMode && selected.has(c.id) ? "bg-muted/40" : ""}`}
                >
                  {selectMode && (
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        aria-label="Sélectionner"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelected(c.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-2">
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        {c.urlLabel} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <Link to="/candidatures/$id" params={{ id: c.id }} className="font-medium hover:underline">
                      {c.poste}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{c.societe}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.date}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.localisation}</td>
                  <td className="px-4 py-2">
                    {c.contact ? <ContactPopover contact={c.contact} /> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2"><JournalDrawer candidature={c as Candidature} /></td>
                  <td className="px-4 py-2">
                    <StatusSelect
                      value={c.statut}
                      onChange={(s) => statusMut.mutate({ id: c.id, status: s })}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => { if (confirm("Supprimer ?")) deleteMut.mutate(c.id); }}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-status-refused-fg"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={selectMode ? 10 : 9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Aucune candidature. Collez une URL pour commencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
