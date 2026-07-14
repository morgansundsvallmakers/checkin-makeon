import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Verify caller is admin
    const { data: myRoles } = await context.supabase
      .from("user_roles")
      .select("role,aktiv")
      .eq("user_id", context.userId);
    const isAdmin = (myRoles ?? []).some(
      (r) => r.role === "admin" && r.aktiv === true,
    );
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("id,user_id,aktiv")
      .eq("role", "admin");
    if (error) throw error;

    const results = await Promise.all(
      (roles ?? []).map(async (r) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          aktiv: r.aktiv,
          email: data.user?.email ?? null,
          created_at: data.user?.created_at ?? null,
        };
      }),
    );
    return results;
  });

export const setAdminActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), aktiv: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: myRoles } = await context.supabase
      .from("user_roles")
      .select("role,aktiv")
      .eq("user_id", context.userId);
    const isAdmin = (myRoles ?? []).some(
      (r) => r.role === "admin" && r.aktiv === true,
    );
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .update({ aktiv: data.aktiv })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
