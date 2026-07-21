import type { CandidatureStatus } from "@/lib/mock-data";
import { STATUS_LABELS } from "@/lib/mock-data";

const STYLES: Record<CandidatureStatus, { bg: string; fg: string }> = {
  sent: { bg: "bg-status-sent-bg", fg: "text-status-sent-fg" },
  ack: { bg: "bg-status-ack-bg", fg: "text-status-ack-fg" },
  interview: { bg: "bg-status-ack-bg", fg: "text-status-ack-fg" },
  offer: { bg: "bg-status-offer-bg", fg: "text-status-offer-fg" },
  refused: { bg: "bg-status-refused-bg", fg: "text-status-refused-fg" },
};

export function StatusBadge({
  status,
  label,
  className = "",
}: {
  status: CandidatureStatus;
  label?: string;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${s.bg} ${s.fg} ${className}`}
    >
      {label ?? shortLabel(status)}
    </span>
  );
}

function shortLabel(s: CandidatureStatus) {
  switch (s) {
    case "sent":
      return "Envoyée";
    case "ack":
      return "Accusé de réception";
    case "interview":
      return "Entretien";
    case "offer":
      return "Offre reçue";
    case "refused":
      return "Refusée";
  }
}

export { STATUS_LABELS };
