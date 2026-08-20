import { useState } from "react";
import { Bell, Mail, Link2, X, Check, Trash2, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listNotifications,
  markNotificationsRead,
  ignoreNotification,
  attachNotification,
  deleteNotification,
  type EmailNotification,
} from "@/lib/notifications.functions";
import { listApplications } from "@/lib/applications.functions";
import { ConfirmDialog } from "@/components/candid/ConfirmDialog";

const CLASS_LABEL: Record<string, string> = {
  envoyee: "Envoyée",
  accuse_reception: "Accusé de réception",
  entretien: "Entretien",
  offre: "Offre",
  refusee: "Refus",
};

const STATUS_OPTIONS = [
  "envoyee",
  "accuse_reception",
  "entretien",
  "offre",
  "refusee",
] as const;


function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function NotificationsBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<EmailNotification | null>(null);
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("none");


  const fetchNotifs = useServerFn(listNotifications);
  const fetchApps = useServerFn(listApplications);
  const markRead = useServerFn(markNotificationsRead);
  const ignoreFn = useServerFn(ignoreNotification);
  const attachFn = useServerFn(attachNotification);
  const deleteFn = useServerFn(deleteNotification);
  const [confirmDelete, setConfirmDelete] = useState<EmailNotification | null>(null);

  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifs(),
    refetchInterval: 30000,
  });

  const { data: apps = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: () => fetchApps(),
    enabled: !!target,
  });

  const unread = notifs.filter((n) => !n.isRead).length;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["applications"] });
  };

  const readAll = useMutation({
    mutationFn: () => markRead({ data: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const ignore = useMutation({
    mutationFn: (id: string) => ignoreFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const removeNotif = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification supprimée");
    },
    onError: (e: any) => toast.error(e?.message ?? "Suppression impossible"),
  });


  const attach = useMutation({
    mutationFn: () =>
      attachFn({
        data: {
          id: target!.id,
          applicationId: selectedApp,
          classification: selectedClass === "none" ? null : (selectedClass as any),
          applyStatus: selectedClass !== "none",
        },
      }),
    onSuccess: () => {
      toast.success("Email rattaché à la candidature");
      setTarget(null);
      setSelectedApp("");
      setSelectedClass("none");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec du rattachement"),
  });


  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (v && unread > 0) readAll.mutate();
  };

  return (
    <>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            aria-label="Notifications"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[640px] p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold">Emails reçus</span>
              {notifs.length > 0 && (
                <span className="text-xs text-muted-foreground">({notifs.length})</span>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/notifications" onClick={() => setOpen(false)}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Voir tout
              </Link>
            </Button>
          </div>
          <ScrollArea className="h-[600px]">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Aucun email transféré pour le moment.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifs.map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 ${n.isRead ? "" : "bg-muted/40"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">
                          {n.subject || "(sans objet)"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {n.sender}
                        </p>
                        {n.applicationLabel && (
                          <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                            {n.applicationPoste} — {n.applicationSociete}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Supprimer la notification"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDelete(n)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>


                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[11px]">
                        {n.classification
                          ? CLASS_LABEL[n.classification] ?? n.classification
                          : "Non classifié"}
                      </Badge>
                      {n.applicationId ? (
                        <Badge variant="outline" className="text-[11px]">
                          Rattaché
                        </Badge>
                      ) : n.status === "ignored" ? (
                        <Badge variant="outline" className="text-[11px]">Ignoré</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[11px]">
                          Non rattaché
                        </Badge>
                      )}
                      {n.status === "attached" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Check className="h-3 w-3" /> manuellement
                        </span>
                      )}
                    </div>


                    {n.snippet && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.snippet}
                      </p>
                    )}

                    {!n.applicationId && n.status !== "ignored" && (
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setTarget(n);
                            setSelectedApp("");
                            setSelectedClass(n.classification ?? "none");

                            setOpen(false);
                          }}
                        >
                          <Link2 className="mr-1 h-3 w-3" />
                          Rattacher
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => ignore.mutate(n.id)}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Ignorer
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Supprimer cette notification ?"
        description="L'email restera dans votre boîte, seule la notification sera supprimée."
        confirmText="Supprimer"
        destructive
        onConfirm={() => {
          const id = confirmDelete?.id;
          setConfirmDelete(null);
          if (id) removeNotif.mutate(id);
        }}
      />

      <Dialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rattacher l'email à une candidature</DialogTitle>
            <DialogDescription>
              {target?.subject || "(sans objet)"} — de {target?.sender}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Candidature</p>
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une candidature" />
                </SelectTrigger>
                <SelectContent>
                  {apps.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.poste} — {a.societe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">
                Statut à appliquer
                <span className="ml-1 font-normal text-muted-foreground">
                  {target?.classification
                    ? `(détecté : ${CLASS_LABEL[target.classification] ?? target.classification})`
                    : "(non détecté)"}
                </span>
              </p>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ne pas changer le statut</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {CLASS_LABEL[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Annuler
            </Button>
            <Button
              disabled={!selectedApp || attach.isPending}
              onClick={() => attach.mutate()}
            >
              {attach.isPending ? "Rattachement…" : "Rattacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
