import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppHeader } from "@/components/candid/AppHeader";
import { getProfile } from "@/lib/applications.functions";
import { Mail, ArrowRight, Copy, Check } from "lucide-react";

const q = queryOptions({ queryKey: ["profile"], queryFn: () => getProfile() });

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Configuration email — CandidTrack" },
      {
        name: "description",
        content:
          "Configurez le transfert automatique de vos emails de recrutement vers CandidTrack pour mettre à jour vos statuts sans effort.",
      },
      { property: "og:title", content: "Configuration email — CandidTrack" },
      {
        property: "og:description",
        content:
          "Transférez vos emails de recruteurs vers votre adresse dédiée CandidTrack : statuts et journal mis à jour automatiquement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Onboarding,
  errorComponent: ({ error }) => <div className="p-8 text-sm">Erreur : {String(error)}</div>,
  notFoundComponent: () => <div className="p-8 text-sm">Introuvable</div>,
});

function Onboarding() {
  const { data: profile } = useSuspenseQuery(q);
  const email = profile?.dedicated_email ?? "";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-lg font-semibold">Configuration email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Transférez les emails de recruteurs vers votre adresse dédiée : CandidTrack met à jour le
          statut et le journal de la candidature automatiquement.
        </p>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Votre adresse dédiée</h2>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-md bg-muted p-3">
            <code className="flex-1 break-all text-sm text-foreground">{email || "—"}</code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Cette adresse est unique et rattachée à votre compte. Tout email reçu dessus est analysé
            puis relié à la candidature correspondante grâce au domaine de l'expéditeur.
          </p>
        </section>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Transfert automatique depuis Gmail</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Gmail → <strong>Paramètres</strong> → <strong>Transfert et POP/IMAP</strong> →{" "}
              <strong>Ajouter une adresse de transfert</strong>, puis collez votre adresse dédiée.
            </li>
            <li>
              Gmail envoie un email de confirmation à cette adresse. Ouvrez{" "}
              <strong>Paramètres → Filtres et adresses bloquées</strong> et validez le code, ou
              cliquez sur le lien de confirmation reçu.
            </li>
            <li>
              Pour ne transférer que les emails de recrutement, créez un{" "}
              <strong>filtre</strong> (ex. mots-clés « candidature », « entretien », « recrutement »)
              avec l'action <strong>Transférer à</strong> votre adresse dédiée.
            </li>
          </ol>
        </section>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Transfert automatique depuis Outlook</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Outlook → <strong>Paramètres</strong> → <strong>Courrier</strong> →{" "}
              <strong>Règles</strong> → <strong>Ajouter une règle</strong>.
            </li>
            <li>
              Condition : objet ou corps contient « candidature », « entretien », « recrutement ».
            </li>
            <li>
              Action : <strong>Rediriger vers</strong> (préférable au simple transfert) votre adresse
              dédiée.
            </li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            Astuce : la redirection conserve l'expéditeur d'origine, ce qui améliore la détection de
            la société. En cas de transfert classique, CandidTrack lit aussi l'en-tête « De : » à
            l'intérieur du message.
          </p>
        </section>

        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Aller au tableau de bord <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    </div>
  );
}
