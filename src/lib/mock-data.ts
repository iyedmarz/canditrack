export type CandidatureStatus = "sent" | "ack" | "interview" | "offer" | "refused";

export type JournalEntry = {
  id: string;
  date: string; // ISO
  text: string;
  source: "auto" | "manual";
};

export type Contact = {
  id?: string;
  name: string;
  role: string;
  email: string;
  linkedin?: string;
};

export type Candidature = {
  id: string;
  url: string;
  urlLabel: string;
  poste: string;
  societe: string;
  date: string; // DD/MM/YY display
  dateISO: string;
  localisation: string;
  skills: string[];
  statut: CandidatureStatus;
  contact?: Contact;
  contacts: Contact[];
  journal: JournalEntry[];
};

export const STATUS_LABELS: Record<CandidatureStatus, string> = {
  sent: "Envoyée",
  ack: "Accusé de réception",
  interview: "Entretien",
  offer: "Offre reçue",
  refused: "Refusée",
};

export const mockCandidatures: Candidature[] = [
  {
    id: "c1",
    url: "https://sii-group.com/offers/ingenieur-ivvq-logiciel",
    urlLabel: "sii-group.com/offers/…",
    poste: "Ingénieur.e IVVQ Logiciel",
    societe: "SII Group",
    date: "13/07/26",
    dateISO: "2026-07-13",
    localisation: "Île-de-France",
    skills: ["Svelte", "Git", "Jira", "CI/CD"],
    statut: "sent",
    contact: {
      name: "Claire Moreau",
      role: "Talent Acquisition",
      email: "claire.moreau@sii-group.com",
      linkedin: "https://linkedin.com/in/clairemoreau",
    },
    journal: [
      {
        id: "j1",
        date: "2026-07-13T09:12:00",
        text: "Candidature envoyée via le formulaire du site",
        source: "manual",
      },
    ],
  },
  {
    id: "c2",
    url: "https://lisi-aerospace.fr/jobs/apprenti-dev",
    urlLabel: "lisi-aerospace.fr/jobs/…",
    poste: "Apprenti Développement",
    societe: "LISI Aerospace",
    date: "13/07/26",
    dateISO: "2026-07-13",
    localisation: "Saint-Ouen-l'Aumône",
    skills: ["C#", ".Net 8", "SQL Server"],
    statut: "sent",
    contact: {
      name: "Julien Perrin",
      role: "Responsable RH",
      email: "j.perrin@lisi-aerospace.fr",
    },
    journal: [
      {
        id: "j2",
        date: "2026-07-13T14:40:00",
        text: "Candidature envoyée",
        source: "manual",
      },
    ],
  },
  {
    id: "c3",
    url: "https://thalesgroup.com/careers/developpeur-web",
    urlLabel: "thalesgroup.com/…",
    poste: "Développeur solution Web",
    societe: "Thales Group",
    date: "20/07/26",
    dateISO: "2026-07-20",
    localisation: "Massy",
    skills: [],
    statut: "ack",
    contact: {
      name: "Sophie Renard",
      role: "Recruiter",
      email: "sophie.renard@thalesgroup.com",
      linkedin: "https://linkedin.com/in/sophierenard",
    },
    journal: [
      {
        id: "j3a",
        date: "2026-07-20T08:00:00",
        text: "Candidature envoyée",
        source: "manual",
      },
      {
        id: "j3b",
        date: "2026-07-21T10:23:00",
        text: "Email reçu : accusé de réception de la candidature",
        source: "auto",
      },
    ],
  },
  {
    id: "c4",
    url: "https://mbda-systems.com/careers/ing-dev-logiciel",
    urlLabel: "mbda-systems.com/…",
    poste: "Ingénieur Dév. Logiciel",
    societe: "MBDA",
    date: "20/07/26",
    dateISO: "2026-07-20",
    localisation: "Bourges",
    skills: ["Angular", "React", "Python"],
    statut: "interview",
    contact: {
      name: "Antoine Girard",
      role: "Engineering Manager",
      email: "antoine.girard@mbda-systems.com",
      linkedin: "https://linkedin.com/in/antoinegirard",
    },
    journal: [
      {
        id: "j4a",
        date: "2026-07-20T09:00:00",
        text: "Candidature envoyée",
        source: "manual",
      },
      {
        id: "j4b",
        date: "2026-07-21T15:12:00",
        text: "Email reçu : accusé de réception",
        source: "auto",
      },
      {
        id: "j4c",
        date: "2026-07-24T11:00:00",
        text: "Email reçu : invitation à un entretien technique le 28/07",
        source: "auto",
      },
    ],
  },
  {
    id: "c5",
    url: "https://capgemini.com/careers/fullstack-engineer",
    urlLabel: "capgemini.com/…",
    poste: "Fullstack Engineer",
    societe: "Capgemini",
    date: "10/07/26",
    dateISO: "2026-07-10",
    localisation: "Nantes",
    skills: ["TypeScript", "Node", "PostgreSQL"],
    statut: "offer",
    contact: {
      name: "Marie Lopez",
      role: "HR Business Partner",
      email: "marie.lopez@capgemini.com",
    },
    journal: [
      { id: "j5a", date: "2026-07-10T09:00:00", text: "Candidature envoyée", source: "manual" },
      { id: "j5b", date: "2026-07-11T10:00:00", text: "Email reçu : accusé de réception", source: "auto" },
      { id: "j5c", date: "2026-07-16T14:00:00", text: "Email reçu : invitation à un entretien", source: "auto" },
      { id: "j5d", date: "2026-07-23T17:30:00", text: "Email reçu : proposition d'embauche", source: "auto" },
    ],
  },
  {
    id: "c6",
    url: "https://airbus.com/careers/software-engineer",
    urlLabel: "airbus.com/…",
    poste: "Software Engineer",
    societe: "Airbus",
    date: "05/07/26",
    dateISO: "2026-07-05",
    localisation: "Toulouse",
    skills: ["C++", "Linux"],
    statut: "refused",
    journal: [
      { id: "j6a", date: "2026-07-05T08:00:00", text: "Candidature envoyée", source: "manual" },
      { id: "j6b", date: "2026-07-15T12:00:00", text: "Email reçu : candidature non retenue", source: "auto" },
    ],
  },
];

export function getStats(items: Candidature[]) {
  const total = items.length;
  const responded = items.filter((c) => c.statut !== "sent").length;
  const interviews = items.filter((c) => c.statut === "interview" || c.statut === "offer").length;
  const offers = items.filter((c) => c.statut === "offer").length;
  const rate = total === 0 ? 0 : Math.round((responded / total) * 100);
  return { total, rate, interviews, offers };
}
