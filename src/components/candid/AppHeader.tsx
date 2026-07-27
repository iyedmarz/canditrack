import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Settings, BarChart3, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function AppHeader() {
  const navigate = useNavigate();
  const [initials, setInitials] = useState("··");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const em = data.user?.email ?? "";
      setInitials(em.slice(0, 2).toUpperCase() || "··");
    });
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
            <NavItem to="/dashboard">Candidatures</NavItem>
            <NavItem to="/jobs">Offres</NavItem>
            <NavItem to="/stats">Statistiques</NavItem>
            <NavItem to="/onboarding">Configuration email</NavItem>
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <IconButton aria-label="Statistiques" to="/stats"><BarChart3 className="h-4 w-4" /></IconButton>
          <IconButton aria-label="Notifications"><Bell className="h-4 w-4" /></IconButton>
          <IconButton aria-label="Réglages" to="/onboarding"><Settings className="h-4 w-4" /></IconButton>
          <button
            onClick={signOut}
            aria-label="Se déconnecter"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <div className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
            {initials}
          </div>
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
