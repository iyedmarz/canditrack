import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("id, email, dedicated_email, full_name, avatar_url, locale, theme")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: userRes } = await context.supabase.auth.getUser();
    const identities = (userRes?.user?.identities ?? []).map((i: any) => ({
      provider: i.provider as string,
      createdAt: (i.created_at ?? null) as string | null,
    }));
    const hasPassword = identities.some((i) => i.provider === "email");

    return {
      profile: profile ?? null,
      email: userRes?.user?.email ?? profile?.email ?? "",
      identities,
      hasPassword,
    };
  });

export const updateProfileSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        full_name: z.string().max(120).optional(),
        avatar_url: z.string().max(500).nullable().optional(),
        locale: z.enum(["fr", "en"]).optional(),
        theme: z.enum(["light", "dark"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.full_name !== undefined) patch.full_name = data.full_name.trim() || null;
    if (data.avatar_url !== undefined) patch.avatar_url = data.avatar_url;
    if (data.locale !== undefined) patch.locale = data.locale;
    if (data.theme !== undefined) patch.theme = data.theme;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const exportAccountData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: apps, error } = await context.supabase
      .from("applications")
      .select("*")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    const ids = (apps ?? []).map((a: any) => a.id);
    let contacts: any[] = [];
    let journal: any[] = [];
    if (ids.length) {
      const [c, j] = await Promise.all([
        context.supabase.from("contacts").select("*").in("application_id", ids),
        context.supabase.from("journal_entries").select("*").in("application_id", ids),
      ]);
      contacts = c.data ?? [];
      journal = j.data ?? [];
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      exportedAt: new Date().toISOString(),
      profile,
      applications: apps ?? [],
      contacts,
      journal_entries: journal,
    };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;

    const { data: apps } = await context.supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId);
    const ids = (apps ?? []).map((a: any) => a.id);
    if (ids.length) {
      await context.supabase.from("journal_entries").delete().in("application_id", ids);
      await context.supabase.from("contacts").delete().in("application_id", ids);
      await context.supabase.from("applications").delete().eq("user_id", userId);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
