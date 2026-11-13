import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Machabeng Sports Day" },
      { name: "description", content: "Choose a new password for your Sports Day official account." },
      { property: "og:title", content: "Reset password — Machabeng Sports Day" },
      { property: "og:description", content: "Choose a new password for your Sports Day official account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-4xl font-bold uppercase">New password</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border bg-card p-5 shadow-card">
        <div className="space-y-1.5">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" size="xl" className="w-full" disabled={busy}>Save password</Button>
      </form>
    </div>
  );
}
