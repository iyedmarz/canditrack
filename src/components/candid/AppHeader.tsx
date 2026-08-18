import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Settings, BarChart3, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { usePrefs } from "@/lib/prefs";

export function AppHeader() {
  const navigate = useNavigate();
  const { t } = usePrefs();
  const [initials, setInitials] = useState("··");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
            <NavItem to="/settings">{t("nav.settings")}</NavItem>
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <IconButton aria-label={t("nav.stats")} to="/stats"><BarChart3 className="h-4 w-4" /></IconButton>
          <IconButton aria-label="Notifications"><Bell className="h-4 w-4" /></IconButton>
          <IconButton aria-label={t("nav.settings")} to="/settings"><Settings className="h-4 w-4" /></IconButton>
          <button
            onClick={signOut}
            aria-label={t("nav.signout")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <Link to="/settings" className="ml-2 block h-7 w-7 overflow-hidden rounded-full bg-primary">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Photo de profil" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-primary-foreground">
                {initials}
              </span>
            )}
          </Link>
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
