import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Candidature, JournalEntry } from "@/lib/mock-data";
import { useState } from "react";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JournalDrawer({ candidature }: { candidature: Candidature }) {
  const [entries, setEntries] = useState<JournalEntry[]>(candidature.journal);
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
    <Sheet>
      <SheetTrigger asChild>
        <button className="rounded-sm text-left text-sm text-foreground hover:underline">
          {entries.length} entrée{entries.length > 1 ? "s" : ""}
        </button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 border-l border-border p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="text-base font-semibold">
            Journal — {candidature.societe}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">{candidature.poste}</p>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-5">
          <ol className="relative space-y-4 border-l border-border pl-5">
            {sorted.map((e) => (
              <li key={e.id} className="relative">
                <span
                  className={`absolute -left-[23px] top-1.5 h-2 w-2 rounded-full ring-2 ring-background ${
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
        </div>
        <div className="border-t border-border p-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Ajouter une note
          </label>
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNote()}
              placeholder="Ex. Relance envoyée…"
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
      </SheetContent>
    </Sheet>
  );
}
