import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { classifyEmail, summarizeForJournal } from "@/lib/classify-email";
import { parsePastedEmail } from "@/lib/parse-email";
import { matchApplication } from "@/lib/match-application";

// Public inbound-email webhook.
// Supports two modes:
//  1. Mailgun "Store and notify" / Routes webhook — multipart/form-data or
//     application/x-www-form-urlencoded, verified via HMAC-SHA256 of
//     `${timestamp}${token}` using MAILGUN_SIGNING_KEY.
//  2. Legacy JSON payload with `x-webhook-secret: INBOUND_EMAIL_SECRET`.
//     Body: { recipient, sender, subject, text }.

type Parsed = {
  recipient: string;
  sender: string;
  subject: string;
  text: string;
};

function verifyMailgun(signingKey: string, timestamp: string, token: string, signature: string): boolean {
  if (!timestamp || !token || !signature) return false;
  // Reject stale (>5min) to prevent replay
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const expected = createHmac("sha256", signingKey).update(timestamp + token).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/inbound-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const mailgunKey = process.env.MAILGUN_SIGNING_KEY;
        const sharedSecret = process.env.INBOUND_EMAIL_SECRET;
        const contentType = request.headers.get("content-type") ?? "";

        let parsed: Parsed | null = null;

        if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
          // Mailgun path
          if (!mailgunKey) return new Response("Mailgun not configured", { status: 500 });
          const form = await request.formData();
          const timestamp = String(form.get("timestamp") ?? "");
          const token = String(form.get("token") ?? "");
          const signature = String(form.get("signature") ?? "");
          if (!verifyMailgun(mailgunKey, timestamp, token, signature)) {
            return new Response("Invalid signature", { status: 401 });
          }
          parsed = {
            recipient: String(form.get("recipient") ?? form.get("To") ?? ""),
            sender: String(form.get("sender") ?? form.get("from") ?? form.get("From") ?? ""),
            subject: String(form.get("subject") ?? form.get("Subject") ?? ""),
            text: String(form.get("body-plain") ?? form.get("stripped-text") ?? ""),
          };
        } else {
          // Legacy JSON path
          if (!sharedSecret) return new Response("Server not configured", { status: 500 });
          const provided = request.headers.get("x-webhook-secret");
          if (provided !== sharedSecret) return new Response("Unauthorized", { status: 401 });
          let body: any;
          try { body = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
          parsed = {
            recipient: String(body.recipient ?? ""),
            sender: String(body.sender ?? ""),
            subject: String(body.subject ?? ""),
            text: String(body.text ?? ""),
          };
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const recipient = parsed.recipient.toLowerCase().trim();
        const sender = parsed.sender.toLowerCase().trim();
        const subject = parsed.subject;
        const text = parsed.text;

        // Extract bare email from "Name <email@x>" if present
        const bareRecipient = recipient.match(/<([^>]+)>/)?.[1] ?? recipient;
        const bareSender = sender.match(/<([^>]+)>/)?.[1] ?? sender;

        if (!bareRecipient) {
          await supabaseAdmin.from("unmatched_email_logs").insert({
            recipient: bareRecipient, sender: bareSender, subject, reason: "missing_recipient",
          });
          return Response.json({ ok: false, reason: "missing_recipient" }, { status: 400 });
        }

        const { data: profile } = await supabaseAdmin
          .from("profiles").select("id, email").eq("dedicated_email", bareRecipient).maybeSingle();
        if (!profile) {
          await supabaseAdmin.from("unmatched_email_logs").insert({
            recipient: bareRecipient, sender: bareSender, subject, reason: "no_user",
          });
          return Response.json({ ok: false, reason: "no_user" }, { status: 200 });
        }

        // When the user forwards a recruiter email from their own mailbox (or any
        // alias / other address), the envelope sender is the user, not the
        // recruiter. Recover the original sender from the forwarded headers
        // inside the body and use whichever gives a match.
        const forwardedSender = parsePastedEmail(text).sender;
        let effectiveSender = bareSender;
        if (
          forwardedSender &&
          (bareSender === String(profile.email ?? "").toLowerCase() ||
            /^(fwd|fw|tr|re)\s*:/i.test(subject) ||
            forwardedSender !== bareSender)
        ) {
          effectiveSender = forwardedSender;
        }

        const { data: apps } = await supabaseAdmin
          .from("applications")
          .select("id, societe, url, statut")
          .eq("user_id", profile.id);

        let result = matchApplication(
          { sender: effectiveSender, senderRaw: sender, subject, text },
          apps ?? [],
        );
        if (!result.application && effectiveSender !== bareSender && bareSender) {
          result = matchApplication(
            { sender: bareSender, senderRaw: sender, subject, text },
            apps ?? [],
          );
        }
        const { application: match, ats, reason: matchReason } = result as any;

        const classified = classifyEmail(`${subject}\n${text}`);
        const snippet = (text ?? "").replace(/\s+/g, " ").trim().slice(0, 400);

        // Always notify the user about the incoming email, matched or not.
        await supabaseAdmin.from("email_notifications").insert({
          user_id: profile.id,
          sender: effectiveSender || bareSender,
          sender_raw: sender,
          subject,
          snippet,
          classification: classified,
          application_id: match?.id ?? null,
          match_reason: match ? (matchReason ?? null) : ats ? "ats" : null,
          status: match ? "matched" : "unmatched",
        });

        if (!match) {
          await supabaseAdmin.from("unmatched_email_logs").insert({
            recipient: bareRecipient,
            sender: effectiveSender || bareSender,
            subject,
            reason: ats ? "no_application_ats" : "no_application",
          });
          return Response.json({ ok: false, reason: "no_application", ats }, { status: 200 });
        }

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
