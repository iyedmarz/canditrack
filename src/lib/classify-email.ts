// Pure classifier for inbound email text.
// Priority order matters — first match wins.

export type ClassifiedStatus = "refusee" | "offre" | "entretien" | "accuse_reception" | null;

const RULES: Array<{ status: Exclude<ClassifiedStatus, null>; keywords: string[] }> = [
  {
    status: "refusee",
    keywords: [
      "regret",
      "ne donnerons pas suite",
      "poste pourvu",
      "autre candidat",
      "ne pas retenir",
    ],
  },
  {
    status: "offre",
    keywords: [
      "proposition d'embauche",
      "contrat de travail",
      "package salarial",
      "date de démarrage",
    ],
  },
  {
    status: "entretien",
    keywords: [
      "entretien téléphonique",
      "disponibilité pour un échange",
      "vous rencontrer",
      "prochaine étape",
      "entretien vidéo",
    ],
  },
  {
    status: "accuse_reception",
    keywords: [
      "bien reçu votre candidature",
      "nous étudions votre profil",
      "accusé de réception",
    ],
  },
];

export function classifyEmail(text: string): ClassifiedStatus {
  const t = text.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => t.includes(k.toLowerCase()))) return rule.status;
  }
  return null;
}

export function summarizeForJournal(status: ClassifiedStatus): string {
  switch (status) {
    case "refusee":
      return "Email reçu : candidature non retenue";
    case "offre":
      return "Email reçu : proposition d'embauche";
    case "entretien":
      return "Email reçu : invitation à un entretien";
    case "accuse_reception":
      return "Email reçu : accusé de réception";
    default:
      return "Email reçu (statut inchangé)";
  }
}
