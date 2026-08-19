import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, BarChart3, LogOut, Settings, Moon, Sun, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { usePrefs } from "@/lib/prefs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const navigate = useNavigate();
  const { t, theme, setTheme, locale, setLocale } = usePrefs();
  const [initials, setInitials] = useState("··");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user || !alive) return;
      const em = user.email ?? "";
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (!alive) return;
      const label = (profile?.full_name || em || "··").slice(0, 2).toUpperCase();
      setInitials(label);
      const path = profile?.avatar_url ?? null;
      if (path && !/^https?:\/\//.test(path)) {
        const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
        if (alive) setAvatarUrl(signed?.signedUrl ?? null);
      } else if (alive) {
        setAvatarUrl(path);
      }
    });
    return () => { alive = false; };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const toggleLocale = () => setLocale(locale === "fr" ? "en" : "fr");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary">
              <span className="text-[11px] font-bold text-primary-foreground">C</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">CandidTrack</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavItem to="/dashboard">{t("nav.applications")}</NavItem>
            <NavItem to="/stats">{t("nav.stats")}</NavItem>
            <NavItem to="/onboarding">{t("nav.email")}</NavItem>
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <IconButton aria-label={t("nav.stats")} to="/stats"><BarChart3 className="h-4 w-4" /></IconButton>
          <NotificationsBell />

          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Menu profil"
                className="ml-2 block h-7 w-7 overflow-hidden rounded-full bg-primary outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Photo de profil" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-primary-foreground">
                    {initials}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex w-full cursor-pointer items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={toggleLocale} className="cursor-pointer">
                <Globe className="h-4 w-4" />
                <span>Langue : {locale === "fr" ? "Français" : "English"}</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span>Mode {theme === "dark" ? "clair" : "sombre"}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" />
                <span>{t("nav.signout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} activeOptions={{ exact: true }}
      className="rounded-sm px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
      activeProps={{ className: "text-foreground font-medium" }}
    >
      {children}
    </Link>
  );
}

function IconButton({
  children, to, ...rest
}: { children: React.ReactNode; to?: string } & React.HTMLAttributes<HTMLElement>) {
  const cls = "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
  if (to) return <Link to={to} className={cls} {...(rest as any)}>{children}</Link>;
  return <button className={cls} {...(rest as any)}>{children}</button>;
}

