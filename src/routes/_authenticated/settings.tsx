import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/candid/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/prefs";
import {
  getAccount,
  updateProfileSettings,
  exportAccountData,
  deleteAccount,
} from "@/lib/settings.functions";
import { Check, Download, Loader2, Moon, Sun, Trash2, Upload, User } from "lucide-react";

const accountQuery = queryOptions({ queryKey: ["account"], queryFn: () => getAccount() });

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres du compte — CandidTrack" },
      { name: "description", content: "Gérez votre profil, votre mot de passe, vos connexions et l'apparence de CandidTrack." },
      { property: "og:title", content: "Paramètres du compte — CandidTrack" },
      { property: "og:description", content: "Profil, sécurité, connexions OAuth, thème et langue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountQuery),
  component: SettingsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm">Erreur : {String(error)}</div>,
  notFoundComponent: () => <div className="p-8 text-sm">Introuvable</div>,
});

function SettingsPage() {
  const { t } = usePrefs();
  const { data } = useSuspenseQuery(accountQuery);
  const [tab, setTab] = useState<"account" | "appearance">("account");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-lg font-semibold">{t("settings.title")}</h1>

        <div className="mt-5 flex gap-1 border-b border-border">
          {(["account", "appearance"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                tab === k
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "account" ? t("settings.account") : t("settings.appearance")}
            </button>
          ))}
        </div>

        {tab === "account" ? <AccountTab data={data} /> : <AppearanceTab />}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring";
const btnCls =
  "inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60";

type Account = Awaited<ReturnType<typeof getAccount>>;

function AccountTab({ data }: { data: Account }) {
  const { t } = usePrefs();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(data.profile?.full_name ?? "");
  const [avatarPath, setAvatarPath] = useState<string | null>(data.profile?.avatar_url ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!avatarPath) { setAvatarUrl(null); return; }
    if (/^https?:\/\//.test(avatarPath)) { setAvatarUrl(avatarPath); return; }
    supabase.storage
      .from("avatars")
      .createSignedUrl(avatarPath, 3600)
      .then(({ data: d }) => { if (alive) setAvatarUrl(d?.signedUrl ?? null); });
    return () => { alive = false; };
  }, [avatarPath]);

  const saveProfile = async (patch: { full_name?: string; avatar_url?: string | null }) => {
    setBusy(true); setSaved(false); setMsg(null);
    try {
      await updateProfileSettings({ data: patch });
      await qc.invalidateQueries({ queryKey: ["account"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f: File) => {
    setBusy(true); setMsg(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Session expirée");
      const ext = (f.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${uid}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, f, { upsert: true });
      if (error) throw error;
      setAvatarPath(path);
      await saveProfile({ avatar_url: path });
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur");
      setBusy(false);
    }
  };

  const changePassword = async () => {
    setPwdMsg(null);
    if (pwd.length < 6) { setPwdMsg("6 caractères minimum"); return; }
    if (pwd !== pwd2) { setPwdMsg("Les mots de passe ne correspondent pas"); return; }
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdMsg(error ? error.message : t("settings.saved"));
    if (!error) { setPwd(""); setPwd2(""); }
  };

  const doExport = async () => {
    const payload = await exportAccountData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `candidtrack-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (e: any) {
      setMsg(e?.message ?? "Erreur");
      setDeleting(false);
    }
  };

  const initials = (name || data.email || "··").slice(0, 2).toUpperCase();

  return (
    <>
      <Section title={t("settings.account")}>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
            {avatarUrl ? (
              <img src={avatarUrl} alt={`Photo de profil de ${name || data.email}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                {initials}
              </div>
            )}
          </div>
          <div>
            <button className={btnGhost} onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload className="h-4 w-4" /> {t("settings.upload")}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
            <p className="mt-1 text-xs text-muted-foreground">PNG ou JPG, 2 Mo max.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted-foreground">{t("settings.name")}</span>
            <input className={`${inputCls} mt-1`} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">{t("settings.email")}</span>
            <input className={`${inputCls} mt-1 opacity-60`} value={data.email} readOnly />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button className={btnCls} disabled={busy} onClick={() => saveProfile({ full_name: name })}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t("settings.save")}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-status-offer-fg">
              <Check className="h-3.5 w-3.5" /> {t("settings.saved")}
            </span>
          )}
          {msg && <span className="text-xs text-status-refused-fg">{msg}</span>}
        </div>
      </Section>

      <Section title={t("settings.password")}>
        {!data.hasPassword && (
          <p className="mb-3 text-xs text-muted-foreground">{t("settings.oauthOnly")}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            type="password" className={inputCls} placeholder={t("settings.newPassword")}
            value={pwd} onChange={(e) => setPwd(e.target.value)}
          />
          <input
            type="password" className={inputCls} placeholder={t("settings.confirmPassword")}
            value={pwd2} onChange={(e) => setPwd2(e.target.value)}
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className={btnGhost} onClick={changePassword}>{t("settings.changePassword")}</button>
          {pwdMsg && <span className="text-xs text-muted-foreground">{pwdMsg}</span>}
        </div>
      </Section>

      <Section title={t("settings.connections")}>
        <ul className="space-y-2 text-sm">
          {data.identities.length === 0 && (
            <li className="text-muted-foreground">—</li>
          )}
          {data.identities.map((i) => (
            <li key={i.provider} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="flex items-center gap-2 capitalize">
                <User className="h-4 w-4 text-muted-foreground" />
                {i.provider === "email" ? "Email / mot de passe" : i.provider}
              </span>
              <span className="text-xs text-muted-foreground">
                {i.createdAt ? new Date(i.createdAt).toLocaleDateString("fr-FR") : "actif"}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("settings.danger")}>
        <p className="text-sm text-muted-foreground">{t("settings.dangerDesc")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className={btnGhost} onClick={doExport}>
            <Download className="h-4 w-4" /> {t("settings.export")}
          </button>
        </div>
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <label className="text-xs text-muted-foreground">{t("settings.deleteConfirm")}</label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              className={`${inputCls} max-w-[200px]`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="SUPPRIMER"
            />
            <button
              onClick={doDelete}
              disabled={confirm.trim().toUpperCase() !== "SUPPRIMER" || deleting}
              className="inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("settings.delete")}
            </button>
          </div>
        </div>
      </Section>
    </>
  );
}

function AppearanceTab() {
  const { t, theme, setTheme, locale, setLocale } = usePrefs();

  const apply = (patch: { theme?: "light" | "dark"; locale?: "fr" | "en" }) => {
    if (patch.theme) setTheme(patch.theme);
    if (patch.locale) setLocale(patch.locale);
    updateProfileSettings({ data: patch }).catch(() => {});
  };

  return (
    <>
      <Section title={t("settings.theme")}>
        <div className="flex gap-2">
          {([["light", Sun], ["dark", Moon]] as const).map(([k, Icon]) => (
            <button
              key={k}
              onClick={() => apply({ theme: k })}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                theme === k ? "border-primary bg-muted font-medium" : "border-input hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {k === "light" ? t("settings.light") : t("settings.dark")}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("settings.language")}>
        <div className="flex gap-2">
          {(["fr", "en"] as const).map((k) => (
            <button
              key={k}
              onClick={() => apply({ locale: k })}
              className={`rounded-md border px-3 py-2 text-sm ${
                locale === k ? "border-primary bg-muted font-medium" : "border-input hover:bg-muted"
              }`}
            >
              {k === "fr" ? "Français" : "English"}
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}
