import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/candid/AppHeader";
import { Copy, Check, Mail } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Configuration email — CandidTrack" },
      {
        name: "description",
        content:
          "Configurez le transfert des emails de recruteurs vers votre adresse CandidTrack pour un suivi automatique.",
      },
      { property: "og:title", content: "Configuration email — CandidTrack" },
      {
        property: "og:description",
        content:
          "Guide étape par étape pour transférer vos emails de recruteurs vers CandidTrack.",
      },
    ],
  }),
  component: Onboarding,
});

const STEPS = [
  {
    n: 1,
    title: "Copier votre adresse dédiée",
    desc: "Chaque compte reçoit une adresse email unique. Tous les emails envoyés à cette adresse sont analysés automatiquement pour détecter accusés, entretiens, offres et refus.",
  },
  {
    n: 2,
    title: "Créer un filtre dans votre boîte mail",
    desc: "Dans Gmail, Outlook ou votre client email : Réglages → Filtres → Nouveau filtre. Ajoutez une règle sur les expéditeurs correspondant à vos candidatures (par ex. contenant « recrutement », « candidature », « RH »).",
  },
  {
    n: 3,
    title: "Configurer un transfert automatique",
    desc: "Dans l'action du filtre, choisissez « Transférer à » et collez l'adresse copiée à l'étape 1. Validez : les emails futurs seront transférés instantanément.",
  },
  {
    n: 4,
    title: "Vérifier",
    desc: "Envoyez-vous un email de test à l'adresse. Il apparaîtra dans le journal de la candidature correspondante en quelques secondes.",
  },
];

function Onboarding() {
  const address = "user123@mail.candidtrack.app";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Configuration du suivi par email
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Transférez les emails de vos recruteurs vers votre adresse CandidTrack. Les statuts se
          mettent à jour tout seuls.
        </p>

        <div className="mt-6 rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> Votre adresse dédiée
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground">
              {address}
            </code>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Cette adresse est personnelle. Ne la partagez pas — elle relie chaque email reçu à
            votre tableau de suivi.
          </p>
        </div>

        <ol className="mt-8 space-y-4">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4 rounded-md border border-border bg-card p-5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {s.n}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
