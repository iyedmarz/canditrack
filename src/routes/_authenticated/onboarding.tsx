import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/candid/AppHeader";
import { getProfile } from "@/lib/applications.functions";
import { Mail, ArrowRight } from "lucide-react";

const q = queryOptions({ queryKey: ["profile"], queryFn: () => getProfile() });

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Configuration email — CandidTrack" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Onboarding,
  errorComponent: ({ error }) => <div className="p-8 text-sm">Erreur : {String(error)}</div>,
  notFoundComponent: () => <div className="p-8 text-sm">Introuvable</div>,
});

function Onboarding() {
  const { data: profile } = useSuspenseQuery(q);
  const email = profile?.dedicated_email ?? "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-lg font-semibold">Configuration email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CandidTrack peut mettre à jour le statut et le journal automatiquement à partir des emails des recruteurs.
        </p>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Option rapide : importer manuellement</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Pas de domaine à configurer. Dans le tableau de bord, cliquez sur <strong>Importer un email</strong>, collez l'email reçu (forwardé ou brut), et CandidTrack le classifie.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Aller au tableau de bord <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Option automatique : Mailgun</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pour recevoir les réponses automatiquement, on utilise Mailgun (plan gratuit : 100 emails/jour). Il faut un domaine que vous possédez.
          </p>
          {email && (
            <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Adresse dédiée configurée : <code className="text-foreground">{email}</code>
            </div>
          )}
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Créez un compte Mailgun et ajoutez votre domaine (ex. <code className="rounded bg-muted px-1 text-foreground">mail.votredomaine.com</code>). Configurez les MX records fournis.</li>
            <li>Dans Mailgun → <strong>Receiving</strong> → <strong>Create Route</strong>, filtrez sur votre domaine et ajoutez l'action <code className="rounded bg-muted px-1 text-foreground">forward("https://votre-app.lovable.app/api/public/inbound-email")</code>.</li>
            <li>Copiez la <strong>HTTP webhook signing key</strong> (Settings → Webhooks) et enregistrez-la comme secret <code className="rounded bg-muted px-1 text-foreground">MAILGUN_SIGNING_KEY</code>.</li>
            <li>CandidTrack vérifie la signature Mailgun, détecte la société via le domaine expéditeur, et classifie le message (accusé, entretien, offre, refus).</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
