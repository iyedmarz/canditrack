import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — CandidTrack" },
      { name: "description", content: "Connectez-vous pour suivre vos candidatures." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        setInfo("Compte créé. Vérifiez votre email si nécessaire, puis connectez-vous.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setError(result.error.message ?? "Google OAuth échoué");
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <Link to="/" className="mb-4 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary">
            <span className="text-[11px] font-bold text-primary-foreground">C</span>
          </div>
          <span className="text-sm font-semibold">CandidTrack</span>
        </Link>
        <h1 className="text-lg font-semibold">
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Suivez vos candidatures et laissez l'IA classer vos emails.
        </p>

        <button
          onClick={google}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Continuer avec Google
        </button>

        <div className="my-4 flex items-center gap-3 text-[11px] uppercase text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
          {error && <p className="text-xs text-status-refused-fg">{error}</p>}
          {info && <p className="text-xs text-muted-foreground">{info}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "…" : mode === "login" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setInfo(null); }}
          className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "login" ? "Pas de compte ? Créer un compte" : "Déjà inscrit ? Se connecter"}
        </button>
      </div>
    </main>
  );
}
