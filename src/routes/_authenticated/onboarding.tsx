import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/candid/AppHeader";
import { getProfile } from "@/lib/applications.functions";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

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
  const [copied, setCopied] = useState(false);
  const email = profile?.dedicated_email ?? "";

  const copy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-lg font-semibold">Configuration email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faites suivre les emails des recruteurs vers cette adresse. CandidTrack met le journal et le statut à jour automatiquement.
        </p>
        <div className="mt-6 rounded-lg border border-border bg-card p-5">
          <label className="text-xs font-medium text-muted-foreground">Votre adresse dédiée</label>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm">{email}</code>
            <button onClick={copy} className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <section className="mt-6 space-y-3 text-sm">
          <h2 className="font-semibold">Comment procéder ?</h2>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Dans Gmail : Paramètres → Transfert → Ajouter l'adresse ci-dessus.</li>
            <li>Créez un filtre pour faire suivre les emails contenant « candidature », « recrutement », etc.</li>
            <li>Nous détectons la société via le domaine expéditeur et classons le message (accusé, entretien, offre, refus).</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
