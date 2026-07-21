import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { toDbStatus } from "./status-map";
import type { CandidatureStatus } from "./mock-data";

// Very small CSV parser (comma or semicolon, quoted fields)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const sep = text.split("\n")[0]?.includes(";") && !text.split("\n")[0]?.includes(",") ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === sep) { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (ch === "\r") { /* skip */ }
      else cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Parse dates in dd/mm/yyyy or dd-mm-yyyy (also dd/mm/yy), fallback to Date constructor (ISO).
function parseDate(s: string): Date {
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10) - 1;
    let yy = parseInt(m[3], 10);
    if (yy < 100) yy += yy < 50 ? 2000 : 1900;
    return new Date(yy, mm, dd);
  }
  return new Date(s);
}


const STATUS_MAP: Record<string, CandidatureStatus> = {
  envoyee: "sent", envoyée: "sent", sent: "sent",
  "accuse de reception": "ack", "accusé de réception": "ack", ack: "ack",
  entretien: "interview", interview: "interview",
  offre: "offer", offer: "offer",
  refusee: "refused", refusée: "refused", refused: "refused",
};

export const importCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ content: z.string().min(1).max(500_000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const rows = parseCSV(data.content);
    if (rows.length < 2) return { imported: 0, skipped: 0, errors: ["Fichier vide"] };

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    const iUrl = idx("url");
    const iPoste = idx("poste");
    const iSociete = idx("societe") === -1 ? idx("société") : idx("societe");
    const iDate = idx("date");
    const iLoc = idx("localisation");
    const iSkills = idx("skills");
    const iStatut = idx("statut") === -1 ? idx("status") : idx("statut");

    if (iPoste === -1 || iSociete === -1) {
      return { imported: 0, skipped: 0, errors: ["Colonnes 'poste' et 'societe' requises"] };
    }

    let imported = 0, skipped = 0;
    const errors: string[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const poste = row[iPoste]?.trim();
      const societe = row[iSociete]?.trim();
      if (!poste || !societe) { skipped++; continue; }
      const url = iUrl >= 0 ? row[iUrl]?.trim() || null : null;
      const rawStatus = iStatut >= 0 ? row[iStatut]?.trim().toLowerCase() : "sent";
      const uiStatus = STATUS_MAP[rawStatus] ?? "sent";
      const date = iDate >= 0 && row[iDate]?.trim() ? parseDate(row[iDate].trim()) : new Date();
      const { error } = await context.supabase.from("applications").insert({
        user_id: context.userId,
        url,
        poste,
        societe,
        date_applied: isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
        localisation: iLoc >= 0 ? row[iLoc]?.trim() || null : null,
        skills: iSkills >= 0 ? row[iSkills]?.trim() || null : null,
        statut: toDbStatus(uiStatus),
      });
      if (error) { errors.push(`Ligne ${r + 1}: ${error.message}`); skipped++; }
      else imported++;
    }
    return { imported, skipped, errors: errors.slice(0, 10) };
  });
