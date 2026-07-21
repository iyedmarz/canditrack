import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CandidTrack — Suivi intelligent de candidatures" },
      { name: "description", content: "Centralisez vos candidatures, laissez l'IA extraire les offres et classer vos emails automatiquement." },
      { property: "og:title", content: "CandidTrack — Suivi intelligent de candidatures" },
      { property: "og:description", content: "Centralisez vos candidatures, laissez l'IA extraire les offres et classer vos emails automatiquement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary">
              <span className="text-[11px] font-bold text-primary-foreground">C</span>
            </div>
            <span className="text-sm font-semibold">CandidTrack</span>
          </div>
          <Link to="/auth" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Se connecter
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Le suivi de candidatures qui se remplit tout seul.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Collez une URL, on extrait le poste. Faites suivre vos emails, on met les statuts à jour.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Commencer gratuitement
          </Link>
        </div>
      </section>
    </main>
  );
}
