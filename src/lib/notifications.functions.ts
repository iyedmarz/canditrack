import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { summarizeForJournal } from "./classify-email";

export type EmailNotification = {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  classification: string | null;
  applicationId: string | null;
  applicationPoste: string | null;
  applicationSociete: string | null;
  applicationLabel: string | null;
  matchReason: string | null;
  status: "matched" | "unmatched" | "attached" | "ignored";
  isRead: boolean;
  createdAt: string;
};


export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmailNotification[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("email_notifications")
      .select("*, applications(poste, societe)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      sender: r.sender ?? "",
      subject: r.subject ?? "",
      snippet: r.snippet ?? "",
      classification: r.classification ?? null,
      applicationId: r.application_id ?? null,
      applicationPoste: r.applications?.poste ?? null,
      applicationSociete: r.applications?.societe ?? null,
      applicationLabel: r.applications
        ? `${r.applications.poste} — ${r.applications.societe}`
        : null,
      matchReason: r.match_reason ?? null,
      status: r.status,
      isRead: r.is_read,
      createdAt: r.created_at,
    }));

  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids?: string[] }) => z.object({ ids: z.array(z.string().uuid()).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase.from("email_notifications").update({ is_read: true }).eq("user_id", userId);
    if (data.ids?.length) q = q.in("id", data.ids);
    else q = q.eq("is_read", false);
    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  });

export const ignoreNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("email_notifications")
      .update({ status: "ignored", is_read: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

// Manually attach an unmatched inbound email to an application: writes a journal
// entry and applies the detected status when one was classified.
export const attachNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      applicationId: string;
      applyStatus?: boolean;
      classification?: string | null;
    }) =>
      z
        .object({
          id: z.string().uuid(),
          applicationId: z.string().uuid(),
          applyStatus: z.boolean().optional(),
          classification: z
            .enum(["envoyee", "accuse_reception", "entretien", "offre", "refusee"])
            .nullish(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: notif, error: nErr } = await supabase
      .from("email_notifications")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (nErr) throw nErr;
    if (!notif) throw new Error("Notification introuvable");

    const { data: app, error: aErr } = await supabase
      .from("applications")
      .select("id, statut")
      .eq("id", data.applicationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!app) throw new Error("Candidature introuvable");

    const classification = (data.classification ?? notif.classification ?? null) as any;
    const contenu = `${summarizeForJournal(classification)}${
      notif.subject ? ` — « ${String(notif.subject).slice(0, 120)} »` : ""
    }${notif.sender ? ` (de ${notif.sender})` : ""}`;

    const { error: jErr } = await supabase.from("journal_entries").insert({
      application_id: app.id,
      type: "auto",
      contenu,
    });
    if (jErr) throw jErr;

    if (data.applyStatus !== false && classification && classification !== app.statut) {

      const { error: uErr } = await supabase
        .from("applications")
        .update({ statut: classification })
        .eq("id", app.id);
      if (uErr) throw uErr;
    }

    const { error: fErr } = await supabase
      .from("email_notifications")
      .update({
        status: "attached",
        application_id: app.id,
        is_read: true,
        classification,
      })
      .eq("id", data.id)
      .eq("user_id", userId);

    if (fErr) throw fErr;

    return { ok: true, applicationId: app.id };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("email_notifications")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });
