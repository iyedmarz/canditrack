import { createFileRoute } from "@tanstack/react-router";
import { classifyEmail, summarizeForJournal } from "@/lib/classify-email";

// Public inbound-email webhook.
// Auth: shared secret in `x-webhook-secret` header (INBOUND_EMAIL_SECRET).
// Expected body (JSON): { recipient, sender, subject, text }
// - recipient = the dedicated user address (e.g. user-xxxx@mail.candidtrack.app)
// - sender    = sending domain used to match societe
// - subject / text = classification input
export const Route = createFileRoute("/api/public/inbound-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.INBOUND_EMAIL_SECRET;
        if (!secret) return new Response("Server not configured", { status: 500 });
        const provided = request.headers.get("x-webhook-secret");
        if (provided !== secret) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let body: any;
        try { body = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

        const recipient = String(body.recipient ?? "").toLowerCase().trim();
        const sender = String(body.sender ?? "").toLowerCase().trim();
        const subject = String(body.subject ?? "");
        const text = String(body.text ?? "");

        if (!recipient) {
          await supabaseAdmin.from("unmatched_email_logs").insert({
            recipient, sender, subject, reason: "missing_recipient",
          });
          return Response.json({ ok: false, reason: "missing_recipient" }, { status: 400 });
        }

        // Match user by dedicated email
        const { data: profile } = await supabaseAdmin
          .from("profiles").select("id").eq("dedicated_email", recipient).maybeSingle();
        if (!profile) {
          await supabaseAdmin.from("unmatched_email_logs").insert({
            recipient, sender, subject, reason: "no_user",
          });
          return Response.json({ ok: false, reason: "no_user" }, { status: 200 });
        }

        // Match application by sender domain (last part after @) vs societe or url
        const domain = sender.split("@")[1] ?? "";
        const stem = domain.split(".").slice(-2, -1)[0] ?? "";
        const { data: apps } = await supabaseAdmin
          .from("applications")
          .select("id, societe, url, statut")
          .eq("user_id", profile.id);

        const match = (apps ?? []).find((a) => {
          const s = String(a.societe ?? "").toLowerCase();
          const u = String(a.url ?? "").toLowerCase();
          return (stem && (s.includes(stem) || u.includes(stem))) || (domain && u.includes(domain));
        });

        if (!match) {
          await supabaseAdmin.from("unmatched_email_logs").insert({
            recipient, sender, subject, reason: "no_application",
          });
          return Response.json({ ok: false, reason: "no_application" }, { status: 200 });
        }

        const classified = classifyEmail(`${subject}\n${text}`);
        const contenu = `${summarizeForJournal(classified)}${subject ? ` — « ${subject.slice(0, 120)} »` : ""}`;
        await supabaseAdmin.from("journal_entries").insert({
          application_id: match.id,
          type: "auto",
          contenu,
        });
        if (classified && classified !== match.statut) {
          await supabaseAdmin.from("applications").update({ statut: classified }).eq("id", match.id);
        }

        return Response.json({ ok: true, application_id: match.id, status: classified });
      },
    },
  },
});
