import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SearchInput = z.object({
  what: z.string().min(1).max(200),
  where: z.string().max(200).optional().default(""),
  contract: z.enum(["all", "cdi", "cdd", "stage", "alternance"]).optional().default("all"),
  page: z.number().int().min(1).max(20).optional().default(1),
  country: z.string().length(2).optional().default("fr"),
});

export type JobResult = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  source: string;
  created: string;
  contractLabel: string;
  alreadyTracked: boolean;
};

function detectSource(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    if (h.includes("linkedin")) return "LinkedIn";
    if (h.includes("welcometothejungle")) return "Welcome to the Jungle";
    if (h.includes("jobteaser")) return "JobTeaser";
    if (h.includes("indeed")) return "Indeed";
    if (h.includes("hellowork")) return "HelloWork";
    if (h.includes("apec")) return "APEC";
    if (h.includes("pole-emploi") || h.includes("francetravail")) return "France Travail";
    if (h.includes("glassdoor")) return "Glassdoor";
    if (h.includes("monster")) return "Monster";
    return h.split(".")[0].replace(/^./, (c) => c.toUpperCase());
  } catch {
    return "Autre";
  }
}

function contractKeywords(c: string): string {
  switch (c) {
    case "cdi": return "CDI";
    case "cdd": return "CDD";
    case "stage": return "stage";
    case "alternance": return "alternance apprentissage";
    default: return "";
  }
}

function normalizeUrl(u: string | null | undefined): string {
  if (!u) return "";
  try {
    const url = new URL(u);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname}`.toLowerCase();
  } catch {
    return String(u).toLowerCase();
  }
}

export const searchJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SearchInput.parse(d))
  .handler(async ({ data, context }): Promise<{ results: JobResult[]; total: number; page: number }> => {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) throw new Error("Adzuna API non configurée");

    const kw = contractKeywords(data.contract);
    const what = kw ? `${data.what} ${kw}`.trim() : data.what;

    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: "30",
      what,
      "content-type": "application/json",
    });
    if (data.where) params.set("where", data.where);
    // Adzuna hint for CDI-like roles
    if (data.contract === "cdi") params.set("contract_type", "permanent");
    if (data.contract === "cdd") params.set("contract_type", "contract");

    const url = `https://api.adzuna.com/v1/api/jobs/${data.country}/search/${data.page}?${params.toString()}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Adzuna ${res.status}: ${body.slice(0, 200)}`);
    }
    const json: any = await res.json();

    // Dedup against user's existing applications
    const { data: rows } = await context.supabase
      .from("applications")
      .select("url, poste, societe")
      .eq("user_id", context.userId);
    const trackedUrls = new Set<string>();
    const trackedKeys = new Set<string>();
    for (const r of rows ?? []) {
      const u = normalizeUrl((r as any).url);
      if (u) trackedUrls.add(u);
      trackedKeys.add(`${((r as any).poste || "").toLowerCase().trim()}|${((r as any).societe || "").toLowerCase().trim()}`);
    }

    const seen = new Set<string>();
    const results: JobResult[] = [];
    for (const j of (json.results ?? []) as any[]) {
      const jurl = String(j.redirect_url ?? "");
      const nurl = normalizeUrl(jurl);
      const title = String(j.title ?? "").trim();
      const company = String(j.company?.display_name ?? "").trim();
      const key = `${title.toLowerCase()}|${company.toLowerCase()}`;
      if (seen.has(nurl) || seen.has(key)) continue;
      seen.add(nurl); seen.add(key);
      const already = trackedUrls.has(nurl) || trackedKeys.has(key);
      results.push({
        id: String(j.id ?? nurl),
        title: title || "(sans titre)",
        company: company || "—",
        location: String(j.location?.display_name ?? ""),
        url: jurl,
        description: String(j.description ?? "").slice(0, 400),
        source: detectSource(jurl),
        created: String(j.created ?? ""),
        contractLabel: j.contract_time
          ? String(j.contract_time)
          : j.contract_type
          ? String(j.contract_type)
          : "",
        alreadyTracked: already,
      });
    }

    return { results, total: Number(json.count ?? results.length), page: data.page };
  });
