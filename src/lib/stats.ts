import type { Candidature, CandidatureStatus } from "./mock-data";

const INTERVIEW_PAT = ["entretien", "interview"];
const OFFER_PAT = ["offre", "offer", "embauche"];

function journalHas(c: Candidature, patterns: string[]) {
  return (c.journal ?? []).some((j) => {
    const t = (j.text ?? "").toLowerCase();
    return patterns.some((p) => t.includes(p));
  });
}

export function everInterviewed(c: Candidature) {
  if (c.statut === "interview" || c.statut === "offer") return true;
  return journalHas(c, INTERVIEW_PAT);
}

export function everOffered(c: Candidature) {
  if (c.statut === "offer") return true;
  return journalHas(c, OFFER_PAT);
}

/** A répondu : statut différent de "envoyée" ou entrée automatique dans le journal */
export function hasResponded(c: Candidature) {
  if (c.statut !== "sent") return true;
  return (c.journal ?? []).some((j) => j.source === "auto");
}

/** Délai en jours entre l'envoi et la première réponse (entrée auto du journal) */
function responseDelayDays(c: Candidature): number | null {
  const sent = new Date(c.dateISO).getTime();
  const firstAuto = (c.journal ?? [])
    .filter((j) => j.source === "auto")
    .map((j) => new Date(j.date).getTime())
    .filter((t) => !Number.isNaN(t) && t >= sent)
    .sort((a, b) => a - b)[0];
  if (!firstAuto) return null;
  return Math.max(0, Math.round((firstAuto - sent) / 86400000));
}

export type Overview = {
  total: number;
  responded: number;
  responseRate: number;
  interviews: number;
  interviewRate: number;
  offers: number;
  successRate: number;
  avgResponseDays: number | null;
};

export function getOverview(items: Candidature[]): Overview {
  const total = items.length;
  const responded = items.filter(hasResponded).length;
  const interviews = items.filter(everInterviewed).length;
  const offers = items.filter(everOffered).length;
  const delays = items.map(responseDelayDays).filter((d): d is number => d !== null);
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return {
    total,
    responded,
    responseRate: pct(responded),
    interviews,
    interviewRate: pct(interviews),
    offers,
    successRate: pct(offers),
    avgResponseDays:
      delays.length === 0
        ? null
        : Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10,
  };
}

export type StatusSlice = { key: string; label: string; value: number; color: string };

/** Répartition : en attente / entretien / offre / refusé / sans réponse */
export function getStatusBreakdown(items: Candidature[]): StatusSlice[] {
  let waiting = 0;
  let noResponse = 0;
  let interview = 0;
  let offer = 0;
  let refused = 0;

  for (const c of items) {
    if (c.statut === "offer") offer++;
    else if (c.statut === "refused") refused++;
    else if (c.statut === "interview") interview++;
    else if (c.statut === "ack") waiting++;
    else if (hasResponded(c)) waiting++;
    else noResponse++;
  }

  return [
    { key: "waiting", label: "En attente", value: waiting, color: "var(--chart-waiting)" },
    { key: "interview", label: "Entretien", value: interview, color: "var(--chart-interview)" },
    { key: "offer", label: "Offre", value: offer, color: "var(--chart-offer)" },
    { key: "refused", label: "Refusé", value: refused, color: "var(--chart-refused)" },
    { key: "none", label: "Sans réponse", value: noResponse, color: "var(--chart-none)" },
  ];
}

export type Granularity = "week" | "month";

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // lundi = 0
  x.setDate(x.getDate() - day);
  return x;
}

export function getTimeline(items: Candidature[], granularity: Granularity, periods = 12) {
  const now = new Date();
  const buckets: { key: string; label: string; start: number; end: number; value: number }[] = [];

  for (let i = periods - 1; i >= 0; i--) {
    if (granularity === "week") {
      const s = startOfWeek(now);
      s.setDate(s.getDate() - i * 7);
      const e = new Date(s);
      e.setDate(s.getDate() + 7);
      buckets.push({
        key: s.toISOString(),
        label: `${String(s.getDate()).padStart(2, "0")}/${String(s.getMonth() + 1).padStart(2, "0")}`,
        start: s.getTime(),
        end: e.getTime(),
        value: 0,
      });
    } else {
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({
        key: s.toISOString(),
        label: s.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        start: s.getTime(),
        end: e.getTime(),
        value: 0,
      });
    }
  }

  for (const c of items) {
    const t = new Date(c.dateISO).getTime();
    if (Number.isNaN(t)) continue;
    const b = buckets.find((x) => t >= x.start && t < x.end);
    if (b) b.value++;
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

export const STATUS_ORDER: CandidatureStatus[] = ["sent", "ack", "interview", "offer", "refused"];
