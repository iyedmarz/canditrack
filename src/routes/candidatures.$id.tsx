import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/candid/AppHeader";
import { StatusBadge } from "@/components/candid/StatusBadge";
import { mockCandidatures, type JournalEntry } from "@/lib/mock-data";
import { ArrowLeft, Info, MapPin, Mail, Linkedin, User } from "lucide-react";

export const Route = createFileRoute("/candidatures/$id")({
  loader: ({ params }) => {
    const c = mockCandidatures.find((x) => x.id === params.id);
    if (!c) throw notFound();
    return c;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.poste ?? "Candidature"} — ${loaderData?.societe ?? "CandidTrack"}` },
      {
        name: "description",
        content: `Détail de la candidature ${loaderData?.poste ?? ""} chez ${loaderData?.societe ?? ""}.`,
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Candidature introuvable.</div>
  ),
  component: Detail,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Detail() {
  const c = Route.useLoaderData();
  const [contact, setContact] = useState(
    c.contact ?? { name: "", role: "", email: "", linkedin: "" },
  );
  const [entries, setEntries] = useState<JournalEntry[]>(c.journal);
  const [note, setNote] = useState("");

  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const addNote = () => {
    if (!note.trim()) return;
    setEntries((prev) => [
      ...prev,
      { id: crypto.randomUUID(), date: new Date().toISOString(), text: note.trim(), source: "manual" },
    ]);
    setNote("");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Retour au tableau
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{c.poste}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{c.societe}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {c.localisation}
              </span>
              <span>·</span>
              <span>Ajoutée le {c.date}</span>
            </div>
          </div>
          <StatusBadge status={c.statut} />
        </div>

        {/* Info bandeau */}
        <div className="mt-6 flex items-start gap-2.5 rounded-md border border-border bg-muted/60 px-3.5 py-2.5 text-xs text-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p>
            Le statut se met à jour automatiquement selon les emails reçus. Tu peux aussi le
            changer manuellement à tout moment.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Contact */}
          <section className="rounded-md border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Contact</h2>
            <div className="grid grid-cols-1 gap-3">
              <ContactField
                label="Nom"
                icon={<User className="h-3.5 w-3.5" />}
                value={contact.name}
                onChange={(v) => setContact({ ...contact, name: v })}
                placeholder="Nom du recruteur"
              />
              <ContactField
                label="Rôle"
                value={contact.role}
                onChange={(v) => setContact({ ...contact, role: v })}
                placeholder="Ex. Talent Acquisition"
              />
              <ContactField
                label="Email"
                icon={<Mail className="h-3.5 w-3.5" />}
                value={contact.email}
                onChange={(v) => setContact({ ...contact, email: v })}
                placeholder="prenom.nom@societe.com"
              />
              <ContactField
                label="LinkedIn"
                icon={<Linkedin className="h-3.5 w-3.5" />}
                value={contact.linkedin ?? ""}
                onChange={(v) => setContact({ ...contact, linkedin: v })}
                placeholder="https://linkedin.com/in/…"
              />
            </div>
          </section>

          {/* Journal */}
          <section className="rounded-md border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Journal</h2>
            <ol className="relative space-y-4 border-l border-border pl-5">
              {sorted.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className={`absolute -left-[23px] top-1.5 h-2 w-2 rounded-full ring-2 ring-card ${
                      e.source === "auto" ? "bg-primary" : "bg-muted-foreground/60"
                    }`}
                  />
                  <div className="text-sm text-foreground">{e.text}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDate(e.date)} ·{" "}
                    {e.source === "auto" ? "détecté automatiquement" : "ajouté manuellement"}
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 border-t border-border pt-4">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Ajouter une note
              </label>
              <div className="flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNote()}
                  placeholder="Ex. Relance par email…"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring"
                />
                <button
                  onClick={addNote}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ContactField({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring"
      />
    </label>
  );
}
