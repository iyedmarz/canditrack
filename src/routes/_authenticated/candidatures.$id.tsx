import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Plus, Pencil, X, Check } from "lucide-react";
import { AppHeader } from "@/components/candid/AppHeader";
import { StatusSelect } from "@/components/candid/StatusSelect";
import {
  getApplication, updateApplicationStatus, addJournalNote,
  addContact, updateContact, deleteContact, updateApplicationSkills,
  updateApplicationDetails,
} from "@/lib/applications.functions";
import type { Contact } from "@/lib/mock-data";

const appQuery = (id: string) =>
  queryOptions({ queryKey: ["application", id], queryFn: () => getApplication({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/candidatures/$id")({
  head: () => ({ meta: [{ title: "Candidature — CandidTrack" }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(appQuery(params.id)),
  component: DetailPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm">Erreur : {String(error)}</div>,
  notFoundComponent: () => <div className="p-8 text-sm">Introuvable</div>,
});

function DetailPage() {
  const { id } = Route.useParams();
  const { data: c } = useSuspenseQuery(appQuery(id));
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [skills, setSkills] = useState((c?.skills ?? []).join(", "));

  const updateFn = useServerFn(updateApplicationStatus);
  const noteFn = useServerFn(addJournalNote);
  const skillsFn = useServerFn(updateApplicationSkills);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["application", id] });

  const statusMut = useMutation({ mutationFn: (s: any) => updateFn({ data: { id, status: s } }), onSuccess: invalidate });
  const noteMut = useMutation({
    mutationFn: () => noteFn({ data: { id, text: note } }),
    onSuccess: () => { setNote(""); invalidate(); },
  });
  const skillsMut = useMutation({
    mutationFn: () => skillsFn({ data: { id, skills } }),
    onSuccess: invalidate,
  });

  if (!c) return <div className="p-8 text-sm">Introuvable</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-6">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Retour</Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{c.poste}</h1>
            <p className="text-sm text-muted-foreground">{c.societe} · {c.localisation || "—"}</p>
            {c.url && (
              <a href={c.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary hover:underline">
                {c.urlLabel}
              </a>
            )}
          </div>
          <StatusSelect value={c.statut} onChange={(s) => statusMut.mutate(s)} />
        </div>

        <section className="mt-6 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Skills / Technologies demandées</h2>
            <button
              onClick={() => skillsMut.mutate()}
              disabled={skillsMut.isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {skillsMut.isPending ? "…" : "Enregistrer"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.split(",").map((s) => s.trim()).filter(Boolean).map((s, i) => (
              <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">{s}</span>
            ))}
            {!skills.trim() && <span className="text-xs text-muted-foreground">Aucune compétence renseignée</span>}
          </div>
          <input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="React, TypeScript, Node.js…"
            className={`${INPUT} mt-3`}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Séparez les compétences par des virgules.</p>
        </section>

        <div className="mt-6 grid gap-6 md:grid-cols-2">

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Contacts recruteurs</h2>
            <ContactsManager applicationId={id} contacts={c.contacts ?? []} onChanged={invalidate} />
          </section>


          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Journal</h2>
            <ol className="mt-3 space-y-3 border-l border-border pl-4">
              {[...c.journal].reverse().map((e) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-[19px] top-1.5 h-2 w-2 rounded-full ring-2 ring-card ${e.source === "auto" ? "bg-primary" : "bg-muted-foreground/60"}`} />
                  <div className="text-sm">{e.text}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(e.date).toLocaleString("fr-FR")}</div>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note…" className={INPUT} />
              <button
                onClick={() => note.trim() && noteMut.mutate()}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Ajouter
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

const INPUT = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-ring";

function ContactsManager({
  applicationId, contacts, onChanged,
}: { applicationId: string; contacts: Contact[]; onChanged: () => void }) {
  const addFn = useServerFn(addContact);
  const updateFn = useServerFn(updateContact);
  const deleteFn = useServerFn(deleteContact);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const addMut = useMutation({
    mutationFn: (v: Omit<Contact, "id">) =>
      addFn({ data: { application_id: applicationId, nom: v.name, role: v.role, email: v.email, linkedin: v.linkedin ?? "" } }),
    onSuccess: () => { setAdding(false); onChanged(); },
  });
  const updateMut = useMutation({
    mutationFn: (v: Contact) =>
      updateFn({ data: { id: v.id!, nom: v.name, role: v.role, email: v.email, linkedin: v.linkedin ?? "" } }),
    onSuccess: () => { setEditingId(null); onChanged(); },
  });
  const deleteMut = useMutation({
    mutationFn: (cid: string) => deleteFn({ data: { id: cid } }),
    onSuccess: onChanged,
  });

  return (
    <div className="mt-3 space-y-3">
      {contacts.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">Aucun contact.</p>
      )}
      {contacts.map((ct) =>
        editingId === ct.id ? (
          <ContactForm
            key={ct.id}
            initial={ct}
            submitLabel="Enregistrer"
            pending={updateMut.isPending}
            onCancel={() => setEditingId(null)}
            onSubmit={(v) => updateMut.mutate({ ...v, id: ct.id })}
          />
        ) : (
          <div key={ct.id} className="rounded-md border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{ct.name || "—"}</div>
                {ct.role && <div className="text-xs text-muted-foreground">{ct.role}</div>}
                {ct.email && <div className="mt-1 truncate text-xs"><a className="text-primary hover:underline" href={`mailto:${ct.email}`}>{ct.email}</a></div>}
                {ct.linkedin && <div className="truncate text-xs"><a className="text-primary hover:underline" href={ct.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></div>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => setEditingId(ct.id!)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Modifier">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { if (confirm("Supprimer ce contact ?")) deleteMut.mutate(ct.id!); }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-status-refused-fg" aria-label="Supprimer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ),
      )}
      {adding ? (
        <ContactForm
          submitLabel="Ajouter"
          pending={addMut.isPending}
          onCancel={() => setAdding(false)}
          onSubmit={(v) => addMut.mutate(v)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter un contact
        </button>
      )}
    </div>
  );
}

function ContactForm({
  initial, submitLabel, pending, onCancel, onSubmit,
}: {
  initial?: Contact;
  submitLabel: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (v: { name: string; role: string; email: string; linkedin: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [linkedin, setLinkedin] = useState(initial?.linkedin ?? "");
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
      <input placeholder="Rôle" value={role} onChange={(e) => setRole(e.target.value)} className={INPUT} />
      <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
      <input placeholder="LinkedIn URL" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className={INPUT} />
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => onSubmit({ name, role, email, linkedin })}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5" /> {pending ? "…" : submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" /> Annuler
        </button>
      </div>
    </div>
  );
}

