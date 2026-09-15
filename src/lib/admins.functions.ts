import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { completeAdminInvitation } from "@/lib/invite-admin.logic";

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
          name:
            typeof data.user?.user_metadata?.name === "string"
              ? data.user.user_metadata.name
              : null,
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

    const { error } = await context.supabase.rpc("set_admin_active", {
      _role_id: data.id,
      _aktiv: data.aktiv,
    });
    if (error) throw error;
    return { ok: true };
  });

export const inviteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        name: z.string().trim().min(1).max(100),
        email: z.string().trim().email().max(254),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: myRoles, error: myRolesError } = await context.supabase
      .from("user_roles")
      .select("role,aktiv")
      .eq("user_id", context.userId);
    if (myRolesError) throw myRolesError;

    const isAdmin = (myRoles ?? []).some((role) => role.role === "admin" && role.aktiv === true);
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const [{ supabaseAdmin }, { getRequestUrl }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@tanstack/react-start/server"),
    ]);
    const redirectTo = new URL("/update-password", getRequestUrl().origin).toString();
    return completeAdminInvitation({
      callerId: context.userId,
      email: data.email,
      name: data.name,
      redirectTo,
      inviteUserByEmail: (email, options) =>
        supabaseAdmin.auth.admin.inviteUserByEmail(email, options),
      grantAdminRole: async (args) => supabaseAdmin.rpc("grant_invited_admin", args).single(),
    });
  });
