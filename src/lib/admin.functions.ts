import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createAccountSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(1).max(80),
  role: z.enum(["admin", "recorder", "viewer"]),
});

/** Admin-only: create a confirmed official account with a role. */
export const createOfficialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createAccountSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) throw new Error("Only admins can create accounts");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.displayName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account");

    const userId = created.user.id;
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: insErr } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });
    if (insErr) throw new Error(insErr.message);

    return { id: userId, email: data.email };
  });
