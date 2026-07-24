// Simple heuristic parser for pasted / forwarded email text.
// Works with raw RFC-style headers (From:, Subject:) and Gmail/Outlook forwards.

export type ParsedEmail = {
  sender: string;
  subject: string;
  text: string;
};

const FROM_PATTERNS = [
  /^From:\s*(.+)$/im,
  /^De:\s*(.+)$/im,
  /^Expéditeur:\s*(.+)$/im,
  /^\s*De\s*:\s*(.+)$/im,
];

const SUBJECT_PATTERNS = [
  /^Subject:\s*(.+)$/im,
  /^Objet:\s*(.+)$/im,
  /^Sujet:\s*(.+)$/im,
];

function extractEmail(raw: string): string {
  const emailMatch = raw.match(/<([^>]+@[^>]+)>/);
  if (emailMatch) return emailMatch[1];
  const loose = raw.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  return loose ? loose[0] : "";
}

export function parsePastedEmail(raw: string): ParsedEmail {
  let sender = "";
  let subject = "";

  for (const p of FROM_PATTERNS) {
    const m = raw.match(p);
    if (m) {
      sender = extractEmail(m[1].trim());
      if (!sender) sender = m[1].trim();
      break;
    }
  }

  for (const p of SUBJECT_PATTERNS) {
    const m = raw.match(p);
    if (m) {
      subject = m[1].trim();
      break;
    }
  }

  // If no headers found, treat first non-empty line as subject and rest as body.
  let body = raw;
  if (!subject && !sender) {
    const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length > 0) {
      subject = lines[0].slice(0, 200);
      body = lines.slice(1).join("\n");
    }
  }

  // Clean up common forward markers.
  body = body
    .replace(/-{5,}\s*Forwarded message\s*-{5,}/i, "\n")
    .replace(/-{5,}\s*Message transféré\s*-{5,}/i, "\n")
    .trim();

  return {
    sender: sender.trim().toLowerCase(),
    subject: subject.trim(),
    text: body,
  };
}
