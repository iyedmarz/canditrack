import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/candid/AppHeader";
import { STATUS_LABELS, type CandidatureStatus } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/add")({
  head: () => ({
    meta: [
      { title: "Ajouter une candidature — CandidTrack" },
      {
        name: "description",
        content: "Ajoutez manuellement une candidature à votre tableau de suivi CandidTrack.",
      },
      { property: "og:title", content: "Ajouter une candidature — CandidTrack" },
      {
        property: "og:description",
        content: "Formulaire d'ajout manuel de candidature CandidTrack.",
      },
    ],
  }),
  component: AddPage,
});

function AddPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    poste: "",
    societe: "",
    date: new Date().toISOString().slice(0, 10),
    localisation: "",
    skills: "",
    statut: "sent" as CandidatureStatus,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Retour au tableau
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Nouvelle candidature
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Ajout manuel — utilisez ce formulaire si l'extraction depuis une URL n'a pas fonctionné.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/" });
          }}
          className="mt-6 rounded-md border border-border bg-card p-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Poste" required>
              <input
                required
                value={form.poste}
                onChange={(e) => set("poste", e.target.value)}
                placeholder="Ex. Ingénieur Dév. Logiciel"
                className={inputCls}
              />
            </Field>
            <Field label="Société" required>
              <input
                required
                value={form.societe}
                onChange={(e) => set("societe", e.target.value)}
                placeholder="Ex. Thales Group"
                className={inputCls}
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Localisation">
              <input
                value={form.localisation}
                onChange={(e) => set("localisation", e.target.value)}
                placeholder="Ex. Paris, Île-de-France"
                className={inputCls}
              />
            </Field>
            <Field label="Skills" className="sm:col-span-2">
              <input
                value={form.skills}
                onChange={(e) => set("skills", e.target.value)}
                placeholder="Séparés par des virgules — React, TypeScript, PostgreSQL"
                className={inputCls}
              />
            </Field>
            <Field label="Statut initial" className="sm:col-span-2">
              <select
                value={form.statut}
                onChange={(e) => set("statut", e.target.value as CandidatureStatus)}
                className={inputCls}
              >
                {(Object.keys(STATUS_LABELS) as CandidatureStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
            <Link
              to="/"
              className="rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground hover:bg-muted"
            >
              Annuler
            </Link>
            <button
              type="submit"
              className="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring";

function Field({
  label,
  children,
  required,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-foreground">
        {label} {required && <span className="text-muted-foreground">*</span>}
      </span>
      {children}
    </label>
  );
}
