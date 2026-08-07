import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppHeader } from "@/components/candid/AppHeader";
import { createApplication } from "@/lib/applications.functions";

export const Route = createFileRoute("/_authenticated/add")({
  head: () => ({ meta: [{ title: "Ajouter — CandidTrack" }] }),
  component: AddPage,
});

function AddPage() {
  const navigate = useNavigate();
  const createFn = useServerFn(createApplication);
  const [poste, setPoste] = useState("");
  const [societe, setSociete] = useState("");
  const [url, setUrl] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await createFn({
        data: { poste, societe, url, localisation, skills, status: "sent" },
      });
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-xl px-6 py-8">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Retour</Link>
        <h1 className="mt-2 text-lg font-semibold">Nouvelle candidature</h1>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <Field label="Poste *"><input required value={poste} onChange={(e) => setPoste(e.target.value)} className={INPUT} /></Field>
          <Field label="Société *"><input required value={societe} onChange={(e) => setSociete(e.target.value)} className={INPUT} /></Field>
          <Field label="URL de l'offre"><input value={url} onChange={(e) => setUrl(e.target.value)} className={INPUT} /></Field>
          <Field label="Localisation"><input value={localisation} onChange={(e) => setLocalisation(e.target.value)} className={INPUT} /></Field>
          <Field label="Skills (séparés par des virgules)"><input value={skills} onChange={(e) => setSkills(e.target.value)} className={INPUT} /></Field>
          {error && <p className="text-xs text-status-refused-fg">{error}</p>}
          <button type="submit" disabled={loading} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {loading ? "…" : "Créer"}
          </button>
        </form>
      </main>
    </div>
  );
}

const INPUT = "w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
