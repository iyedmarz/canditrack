import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppHeader } from "@/components/candid/AppHeader";
import { importCsv } from "@/lib/import.functions";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({ meta: [{ title: "Importer CSV — CandidTrack" }] }),
  component: ImportPage,
});

function ImportPage() {
  const importFn = useServerFn(importCsv);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true); setResult(null);
    try {
      const content = await file.text();
      const r = await importFn({ data: { content } });
      setResult(r);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-xl px-6 py-8">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Retour</Link>
        <h1 className="mt-2 text-lg font-semibold">Importer un CSV</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Colonnes attendues : <code>url, poste, societe, date, localisation, skills, statut</code>. Seules <code>poste</code> et <code>societe</code> sont obligatoires.
        </p>
        <input
          type="file" accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="mt-6 block w-full text-sm"
        />
        {loading && <p className="mt-4 text-sm text-muted-foreground">Import en cours…</p>}
        {result && (
          <div className="mt-4 rounded-md border border-border bg-card p-4 text-sm">
            <p><strong>{result.imported}</strong> importées, <strong>{result.skipped}</strong> ignorées.</p>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-status-refused-fg">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
