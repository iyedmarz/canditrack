// Matching d'un email entrant vers une candidature.
//
// Cas simple : l'expéditeur porte le domaine de l'entreprise
//   recrutement@valeo.com  -> stem "valeo"
//
// Cas job board / ATS : le domaine est celui de l'outil, pas de l'entreprise
//   carrier@myworkday.com          -> "carrier" (local part)
//   noreply@carrier.taleo.net      -> "carrier" (sous-domaine)
//   Carrier <no-reply@greenhouse.io> -> "carrier" (nom affiché)
// On ignore alors le domaine et on cherche le nom de société dans :
// local part, sous-domaine, nom affiché, sujet, puis corps du mail.

export const ATS_DOMAINS = [
  "myworkday.com",
  "myworkdayjobs.com",
  "workday.com",
  "taleo.net",
  "greenhouse.io",
  "lever.co",
  "smartrecruiters.com",
  "successfactors.com",
  "icims.com",
  "workable.com",
  "teamtailor.com",
  "recruitee.com",
  "ashbyhq.com",
  "personio.de",
  "brassring.com",
  "avature.net",
  "cornerstoneondemand.com",
  "jobteaser.com",
  "welcometothejungle.com",
  "indeed.com",
  "linkedin.com",
  "monster.fr",
  "apec.fr",
  "hellowork.com",
  "pole-emploi.fr",
  "francetravail.fr",
  "glassdoor.com",
];

const GENERIC_LOCAL_PARTS = new Set([
  "noreply", "no-reply", "donotreply", "do-not-reply", "notification", "notifications",
  "recrutement", "recruiting", "recruitment", "recruiter", "careers", "career", "jobs",
  "job", "talent", "talents", "hr", "rh", "contact", "info", "mail", "support", "team",
  "candidature", "candidatures", "apply", "application", "applications", "hello", "bonjour",
]);

function norm(v: string): string {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function isAtsDomain(domain: string): boolean {
  return ATS_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export type MatchInput = {
  /** Adresse email de l'expéditeur effectif (déjà nettoyée). */
  sender: string;
  /** Chaîne brute "Nom <email>" si disponible, pour le nom affiché. */
  senderRaw?: string;
  subject?: string;
  text?: string;
};

export type MatchCandidate = { id: string; societe?: string | null; url?: string | null };

export type MatchResult<T extends MatchCandidate> = {
  application: T | null;
  /** Comment le match a été trouvé (utile pour debug/logs). */
  via: "domain" | "url" | "local-part" | "subdomain" | "display-name" | "subject" | "body" | null;
  /** Le domaine expéditeur est-il un ATS / job board ? */
  ats: boolean;
};

export function matchApplication<T extends MatchCandidate>(
  input: MatchInput,
  apps: T[],
): MatchResult<T> {
  const sender = (input.sender ?? "").toLowerCase().trim();
  const localPart = sender.split("@")[0] ?? "";
  const domain = sender.split("@")[1] ?? "";
  const ats = isAtsDomain(domain);
  const labels = domain.split(".");
  const stem = labels.length >= 2 ? labels[labels.length - 2] : "";
  const subdomains = labels.slice(0, Math.max(0, labels.length - 2));
  const displayName = (input.senderRaw ?? "").split("<")[0] ?? "";

  const entries = apps.map((a) => ({
    app: a,
    societe: norm(String(a.societe ?? "")),
    url: String(a.url ?? "").toLowerCase(),
  }));

  const bySociete = (needleRaw: string): T | null => {
    const needle = norm(needleRaw);
    if (needle.length < 3) return null;
    const hit = entries.find(
      (e) => e.societe && (e.societe === needle || e.societe.includes(needle) || needle.includes(e.societe)),
    );
    return hit ? hit.app : null;
  };

  // 1. URL de l'offre contenant le domaine (fiable même pour un ATS :
  //    ex. carrier.wd5.myworkdayjobs.com dans l'URL)
  if (domain) {
    const hit = entries.find((e) => e.url && e.url.includes(domain));
    if (hit) return { application: hit.app, via: "url", ats };
  }

  // 2. Domaine d'entreprise classique
  if (!ats && stem) {
    const hit = bySociete(stem);
    if (hit) return { application: hit, via: "domain", ats };
    const urlHit = entries.find((e) => e.url && e.url.includes(stem));
    if (urlHit) return { application: urlHit.app, via: "domain", ats };
  }

  // 3. Sous-domaine : carrier.taleo.net
  for (const sub of subdomains) {
    if (sub === "www" || sub === "mail" || /^wd\d+$/.test(sub)) continue;
    const hit = bySociete(sub);
    if (hit) return { application: hit, via: "subdomain", ats };
  }

  // 4. Local part : carrier@myworkday.com
  if (localPart && !GENERIC_LOCAL_PARTS.has(localPart)) {
    for (const piece of localPart.split(/[._+-]/)) {
      const hit = bySociete(piece);
      if (hit) return { application: hit, via: "local-part", ats };
    }
  }

  // 5. Nom affiché : "Carrier Recruiting <no-reply@myworkday.com>"
  if (displayName) {
    for (const word of displayName.split(/[\s,|/()·—-]+/)) {
      const hit = bySociete(word);
      if (hit) return { application: hit, via: "display-name", ats };
    }
  }

  // 6. Nom de société présent dans le sujet, puis dans le corps
  const subject = norm(input.subject ?? "");
  const body = norm((input.text ?? "").slice(0, 4000));
  for (const source of [
    { hay: subject, via: "subject" as const },
    { hay: body, via: "body" as const },
  ]) {
    if (!source.hay) continue;
    const hit = entries
      .filter((e) => e.societe.length >= 3 && source.hay.includes(e.societe))
      // la société la plus longue reconnue est la plus spécifique
      .sort((a, b) => b.societe.length - a.societe.length)[0];
    if (hit) return { application: hit.app, via: source.via, ats };
  }

  return { application: null, via: null, ats };
}
