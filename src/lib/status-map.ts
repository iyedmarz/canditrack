import type { CandidatureStatus } from "./mock-data";

export type DbStatus = "envoyee" | "accuse_reception" | "entretien" | "offre" | "refusee";

const DB_TO_UI: Record<DbStatus, CandidatureStatus> = {
  envoyee: "sent",
  accuse_reception: "ack",
  entretien: "interview",
  offre: "offer",
  refusee: "refused",
};

const UI_TO_DB: Record<CandidatureStatus, DbStatus> = {
  sent: "envoyee",
  ack: "accuse_reception",
  interview: "entretien",
  offer: "offre",
  refused: "refusee",
};

export const toUiStatus = (s: string): CandidatureStatus =>
  DB_TO_UI[s as DbStatus] ?? "sent";
export const toDbStatus = (s: CandidatureStatus): DbStatus => UI_TO_DB[s];
