import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parsePastedEmail } from "@/lib/parse-email";
import { processInboundEmail } from "@/lib/applications.functions";
import { Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function EmailImportDrawer() {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const qc = useQueryClient();
  const processFn = useServerFn(processInboundEmail);

  const mut = useMutation({
    mutationFn: async () => {
      const parsed = parsePastedEmail(raw);
      if (!parsed.sender && !parsed.subject && !parsed.text) {
        throw new Error("Aucun contenu détecté. Collez l'email reçu.");
      }
      return processFn({ data: parsed });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mut.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-4 py-2 text-sm font-medium hover:bg-muted">
          <Mail className="h-4 w-4" /> Importer un email
        </button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 border-l border-border p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="text-base font-semibold">Importer un email reçu</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Collez ici l'email brut ou forwardé d'un recruteur. CandidTrack essaie de le rattacher à une candidature et met à jour le statut.
          </p>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-1 flex-col gap-4 p-5">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={`Ex.\nFrom: recruteur@thalesgroup.com\nSubject: Entretien pour le poste de Développeur Web\n\nBonjour,\nNous souhaiterions vous rencontrer…`}
            className="min-h-[220px] flex-1 resize-none rounded-md border border-input bg-background p-3 text-sm outline-none focus:border-ring"
          />
          {mut.isError && (
            <div className="flex items-start gap-2 rounded-md border border-status-refused/30 bg-status-refused/10 p-3 text-sm text-status-refused-fg">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{String(mut.error)}</span>
            </div>
          )}
          {mut.data && (
            <div className={`rounded-md border p-3 text-sm ${mut.data.ok ? "border-status-ack/30 bg-status-ack/10 text-status-ack-fg" : "border-status-refused/30 bg-status-refused/10 text-status-refused-fg"}`}>
              {mut.data.ok ? (
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p>Email rattaché à une candidature.</p>
                    {mut.data.status && (
                      <p className="mt-1 capitalize">Statut détecté : {mut.data.status}</p>
                    )}
                    <Link
                      to="/candidatures/$id"
                      params={{ id: mut.data.application_id }}
                      onClick={() => setOpen(false)}
                      className="mt-2 inline-block text-primary hover:underline"
                    >
                      Voir la candidature →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Aucune candidature ne correspond à l'expéditeur. Vérifiez la société ou ajoutez-la manuellement.
                  </span>
                </div>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={mut.isPending || !raw.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Analyser l'email
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
