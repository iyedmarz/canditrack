import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { AppHeader } from "@/components/candid/AppHeader";
import { ConfirmDialog } from "@/components/candid/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ignoreNotification,
  attachNotification,
  deleteNotification,
  type EmailNotification,
} from "@/lib/notifications.functions";
import { listApplications } from "@/lib/applications.functions";
import { toast } from "sonner";
import { Mail, Link2, X, Trash2, ArrowLeft, Check, ExternalLink } from "lucide-react";

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

const notifsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: () => listNotifications(),
});

const appsQuery = queryOptions({
  queryKey: ["applications"],
  queryFn: () => listApplications(),
});

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CandidTrack" },
      { name: "description", content: "Emails transférés et notifications de candidatures." },
      { property: "og:title", content: "Notifications — CandidTrack" },
      { property: "og:description", content: "Emails transférés et notifications de candidatures." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(notifsQuery),
      context.queryClient.ensureQueryData(appsQuery),
    ]),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: notifs = [] } = useQuery(notifsQuery);
  const { data: apps = [] } = useQuery(appsQuery);

  const [target, setTarget] = useState<EmailNotification | null>(null);
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("none");
  const [confirmDelete, setConfirmDelete] = useState<EmailNotification | null>(null);

  const ignoreFn = useServerFn(ignoreNotification);
  const attachFn = useServerFn(attachNotification);
  const deleteFn = useServerFn(deleteNotification);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["applications"] });
  };

  const ignore = useMutation({
    mutationFn: (id: string) => ignoreFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Notification ignorée");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-6">
        <div className="mb-6 flex items-center gap-4">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour
          </Link>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <span className="ml-auto text-sm text-muted-foreground">{notifs.length} email{notifs.length > 1 ? "s" : ""}</span>
        </div>

        {notifs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card py-16 text-center">
            <Mail className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun email transféré pour le moment.
            </p>
            <p className="text-xs text-muted-foreground">
              Transférez les réponses des recruteurs vers votre adresse dédiée pour les voir ici.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifs.map((n) => (
              <div
                key={n.id}
                className={`rounded-lg border border-border bg-card p-4 ${n.isRead ? "" : "bg-muted/30"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {n.subject || "(sans objet)"}
                      </p>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{n.sender}</p>
                    {n.applicationLabel && (
                      <p className="mt-1 text-xs font-medium text-foreground">
                        {n.applicationPoste} — {n.applicationSociete}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Supprimer la notification"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDelete(n)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={n.classification ? "default" : "secondary"} className="text-xs">
                    {n.classification
                      ? CLASS_LABEL[n.classification] ?? n.classification
                      : "Non classifié"}
                  </Badge>
                  {n.applicationId ? (
                    <Badge variant="outline" className="text-xs">
                      Rattaché
                    </Badge>
                  ) : n.status === "ignored" ? (
                    <Badge variant="outline" className="text-xs">Ignoré</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      Non rattaché
                    </Badge>
                  )}
                  {n.status === "attached" && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="h-3 w-3" /> manuellement
                    </span>
                  )}
                </div>

                {n.snippet && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {n.snippet}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2">
                  {!n.applicationId && n.status !== "ignored" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          setTarget(n);
                          setSelectedApp("");
                          setSelectedClass(n.classification ?? "none");
                        }}
                      >
                        <Link2 className="mr-1 h-3.5 w-3.5" />
                        Rattacher
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={() => ignore.mutate(n.id)}
                        disabled={ignore.isPending}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Ignorer
                      </Button>
                    </>
                  )}
                  {n.applicationId && (
                    <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
                      <Link to="/candidatures/$id" params={{ id: n.applicationId }}>
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Voir la candidature
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

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
          if (id) remove.mutate(id);
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
    </div>
  );
}
