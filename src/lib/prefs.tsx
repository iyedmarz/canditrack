import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
export type Locale = "fr" | "en";

const dict = {
  fr: {
    "nav.applications": "Candidatures",
    "nav.stats": "Statistiques",
    "nav.email": "Configuration email",
    "nav.settings": "Paramètres",
    "nav.signout": "Se déconnecter",
    "settings.title": "Paramètres",
    "settings.account": "Compte",
    "settings.appearance": "Apparence",
    "settings.name": "Nom",
    "settings.email": "Email",
    "settings.photo": "Photo de profil",
    "settings.upload": "Changer la photo",
    "settings.save": "Enregistrer",
    "settings.saved": "Enregistré",
    "settings.password": "Mot de passe",
    "settings.newPassword": "Nouveau mot de passe",
    "settings.confirmPassword": "Confirmer",
    "settings.changePassword": "Changer le mot de passe",
    "settings.oauthOnly": "Ton compte utilise uniquement la connexion sociale. Tu peux définir un mot de passe ici.",
    "settings.connections": "Connexions actives",
    "settings.danger": "Supprimer le compte",
    "settings.dangerDesc": "Cette action est définitive. Exporte tes données avant de continuer.",
    "settings.export": "Exporter mes données (JSON)",
    "settings.delete": "Supprimer définitivement",
    "settings.deleteConfirm": "Tape SUPPRIMER pour confirmer",
    "settings.theme": "Thème",
    "settings.light": "Clair",
    "settings.dark": "Sombre",
    "settings.language": "Langue de l'interface",
  },
  en: {
    "nav.applications": "Applications",
    "nav.stats": "Statistics",
    "nav.email": "Email setup",
    "nav.settings": "Settings",
    "nav.signout": "Sign out",
    "settings.title": "Settings",
    "settings.account": "Account",
    "settings.appearance": "Appearance",
    "settings.name": "Name",
    "settings.email": "Email",
    "settings.photo": "Profile picture",
    "settings.upload": "Change picture",
    "settings.save": "Save",
    "settings.saved": "Saved",
    "settings.password": "Password",
    "settings.newPassword": "New password",
    "settings.confirmPassword": "Confirm",
    "settings.changePassword": "Change password",
    "settings.oauthOnly": "Your account uses social sign-in only. You can set a password here.",
    "settings.connections": "Active connections",
    "settings.danger": "Delete account",
    "settings.dangerDesc": "This is permanent. Export your data before continuing.",
    "settings.export": "Export my data (JSON)",
    "settings.delete": "Delete permanently",
    "settings.deleteConfirm": "Type DELETE to confirm",
    "settings.theme": "Theme",
    "settings.light": "Light",
    "settings.dark": "Dark",
    "settings.language": "Interface language",
  },
} as const;

type Key = keyof (typeof dict)["fr"];

type Ctx = {
  theme: Theme;
  locale: Locale;
  setTheme: (t: Theme) => void;
  setLocale: (l: Locale) => void;
  t: (k: Key) => string;
};

const PrefsContext = createContext<Ctx>({
  theme: "light",
  locale: "fr",
  setTheme: () => {},
  setLocale: () => {},
  t: (k) => dict.fr[k],
});

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const t = (localStorage.getItem("ct.theme") as Theme | null) ?? "light";
    const l = (localStorage.getItem("ct.locale") as Locale | null) ?? "fr";
    setThemeState(t);
    setLocaleState(l);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = locale;
  }, [theme, locale]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("ct.theme", t); } catch { /* ignore */ }
  };
  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem("ct.locale", l); } catch { /* ignore */ }
  };

  return (
    <PrefsContext.Provider
      value={{ theme, locale, setTheme, setLocale, t: (k) => dict[locale][k] ?? dict.fr[k] }}
    >
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  return useContext(PrefsContext);
}
