import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { toDbStatus, toUiStatus } from "./status-map";
import type { Candidature, CandidatureStatus } from "./mock-data";

function mapApp(row: any, contacts: any[] = [], journal: any[] = []): Candidature {
  return {
    id: row.id,
    url: row.url ?? "",
    poste: row.poste,
    societe: row.societe,
    date: row.date_applied,
    localisation: row.localisation ?? "",
    skills: (row.skills ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
    status: toUiStatus(row.statut) as CandidatureStatus,
    contacts: contacts.map((c) => ({
      id: c.id,
      nom: c.nom ?? "",
      role: c.role ?? "",
      email: c.email ?? undefined,
      linkedin: c.linkedin ?? undefined,
    })),
    journal: journal.map((j) => ({
      id: j.id,
      date: j.created_at,
      text: j.contenu,
      source: j.type === "auto" ? "auto" : "manual",
    })),
  };
}

export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("applications")
      .select("*, contacts(*), journal_entries(*)")
      .order("date_applied", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => mapApp(r, r.contacts, r.journal_entries));
  });

export const getApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("applications")
      .select("*, contacts(*), journal_entries(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return mapApp(row, (row as any).contacts, (row as any).journal_entries);
  });

const CreateInput = z.object({
  url: z.string().url().optional().or(z.literal("")),
  poste: z.string().min(1).max(200),
  societe: z.string().min(1).max(200),
  localisation: z.string().max(200).optional().default(""),
  skills: z.string().max(500).optional().default(""),
  status: z.enum(["sent", "ack", "interview", "offer", "refused"]).default("sent"),
});

export const createApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("applications")
      .insert({
        user_id: context.userId,
        url: data.url || null,
        poste: data.poste,
        societe: data.societe,
        localisation: data.localisation || null,
        skills: data.skills || null,
        statut: toDbStatus(data.status),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("journal_entries").insert({
      application_id: row.id,
      type: "manual",
      contenu: "Candidature créée",
    });
    return { id: row.id as string };
  });

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["sent", "ack", "interview", "offer", "refused"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("applications")
      .update({ statut: toDbStatus(data.status) })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("journal_entries").insert({
      application_id: data.id,
      type: "manual",
      contenu: `Statut mis à jour : ${data.status}`,
    });
    return { ok: true };
  });

export const deleteApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("applications").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("email, dedicated_email")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
