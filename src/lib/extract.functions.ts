import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ExtractInput = z.object({ url: z.string().url() });

type Extracted = {
  poste: string;
  societe: string;
  localisation: string;
  skills: string[];
};

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 CandidTrackBot/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip scripts/styles then tags
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned.slice(0, 8000);
  } catch {
    return "";
  }
}

export const extractFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExtractInput.parse(d))
  .handler(async ({ data }): Promise<Extracted> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const pageText = await fetchPageText(data.url);
    const prompt = `Analyse cette offre d'emploi et retourne UNIQUEMENT un JSON strict avec les clés :
{"poste": string, "societe": string, "localisation": string, "skills": string[]}

Règles :
- poste = intitulé exact
- societe = nom de l'entreprise
- localisation = ville ou région (chaîne unique)
- skills = 3 à 8 technologies/compétences clés

URL: ${data.url}
Contenu extrait :
"""
${pageText || "(pas de contenu extrait, devine à partir de l'URL)"}
"""`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu réponds uniquement avec du JSON valide, sans balises markdown." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Trop de requêtes IA, réessayez dans un instant");
      if (res.status === 402) throw new Error("Crédits Lovable AI épuisés");
      throw new Error(`Extraction IA échouée : ${res.status} ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    return {
      poste: String(parsed.poste ?? "").slice(0, 200) || "Poste inconnu",
      societe: String(parsed.societe ?? "").slice(0, 200) || "Entreprise inconnue",
      localisation: String(parsed.localisation ?? "").slice(0, 200),
      skills: Array.isArray(parsed.skills)
        ? parsed.skills.map((s: any) => String(s)).slice(0, 12)
        : [],
    };
  });
