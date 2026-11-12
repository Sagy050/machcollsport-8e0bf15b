import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSportsData } from "@/hooks/use-sports-data";
import { createOfficialAccount } from "@/lib/admin.functions";
import {
  GENDERS,
  GENDER_LABEL,
  LEVELS,
  LEVEL_LABEL,
  MEASURES,
  MEASURE_LABEL,
  ROLE_LABEL,
  ordinal,
  type AppRole,
  type EventGender,
  type EventLevel,
  type MeasureType,
  type SportEvent,
} from "@/lib/sports";
import { PageHeader, EmptyState } from "@/components/sports/page";
import { StatusBadge } from "@/components/sports/status-badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Machabeng Sports Day 2026" },
      { name: "description", content: "Manage events, points, officials and data for Sports Day." },
      { property: "og:title", content: "Admin — Machabeng Sports Day 2026" },
      { property: "og:description", content: "Manage events, points, officials and data for Sports Day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <EmptyState title="Admins only">
          Your account doesn't have admin access. <Link to="/" className="underline">Back to standings</Link>
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <PageHeader eyebrow="Control room" title="Admin" />
      <Tabs defaultValue="events">
        <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-grid">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="points">Points</TabsTrigger>
          <TabsTrigger value="officials">Officials</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="mt-4"><EventsAdmin /></TabsContent>
        <TabsContent value="points" className="mt-4"><PointsAdmin /></TabsContent>
        <TabsContent value="officials" className="mt-4"><OfficialsAdmin /></TabsContent>
        <TabsContent value="data" className="mt-4"><DataAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Events ---------------- */

type EventDraft = {
  name: string;
  level: EventLevel;
  gender: EventGender;
  measure: MeasureType;
  is_team: boolean;
  points_multiplier: number;
  scheduled_time: string;
  venue: string;
};

const emptyDraft: EventDraft = {
  name: "",
  level: "junior",
  gender: "open",
  measure: "time",
  is_team: false,
  points_multiplier: 1,
  scheduled_time: "",
  venue: "",
};

function EventsAdmin() {
  const { events, results } = useSportsData();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<SportEvent | null>(null);
  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["results"] });
      toast.success("Event deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-2">
        <p className="text-sm text-muted-foreground">{events.length} events</p>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> New event</Button>
      </div>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
        {events.map((e) => {
          const n = results.filter((r) => r.event_id === e.id).length;
          return (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="w-12 font-display font-bold tabular">{e.scheduled_time ?? "—"}</span>
              <div className="min-w-0 flex-1">
                <Link to="/events/$eventId" params={{ eventId: e.id }} className="font-semibold hover:underline">{e.name}</Link>
                <p className="text-xs text-muted-foreground">
                  {LEVEL_LABEL[e.level]} · {GENDER_LABEL[e.gender]} · {MEASURE_LABEL[e.measure]}
                  {e.is_team && " · Team"} · ×{Number(e.points_multiplier)} · {n} entries
                </p>
              </div>
              <StatusBadge status={e.status} className="hidden sm:inline-flex" />
              <Button size="icon" variant="ghost" aria-label="Edit event" onClick={() => { setEditing(e); setOpen(true); }}><Pencil /></Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label="Delete event"><Trash2 /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {e.name}?</AlertDialogTitle>
                    <AlertDialogDescription>This also deletes its {n} result{n === 1 ? "" : "s"}. This can't be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del.mutate(e.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          );
        })}
      </ul>
      <EventDialog open={open} onOpenChange={setOpen} event={editing} />
    </div>
  );
}

function EventDialog({ open, onOpenChange, event }: { open: boolean; onOpenChange: (o: boolean) => void; event: SportEvent | null }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [d, setD] = useState<EventDraft>(emptyDraft);

  useEffect(() => {
    if (!open) return;
    setD(
      event
        ? {
            name: event.name,
            level: event.level,
            gender: event.gender,
            measure: event.measure,
            is_team: event.is_team,
            points_multiplier: Number(event.points_multiplier),
            scheduled_time: event.scheduled_time ?? "",
            venue: event.venue ?? "",
          }
        : emptyDraft,
    );
  }, [open, event]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: d.name.trim(),
        level: d.level,
        gender: d.gender,
        measure: d.measure,
        is_team: d.is_team,
        points_multiplier: d.points_multiplier,
        scheduled_time: d.scheduled_time.trim() || null,
        venue: d.venue.trim() || null,
      };
      if (!payload.name) throw new Error("Name is required");
      if (!(payload.points_multiplier > 0 && payload.points_multiplier <= 5)) throw new Error("Multiplier must be between 0 and 5");
      const { error } = event
        ? await supabase.from("events").update(payload).eq("id", event.id)
        : await supabase.from("events").insert({ ...payload, created_by: user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success(event ? "Event updated" : "Event created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}
          className="grid gap-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="ev-name">Event name</Label>
            <Input id="ev-name" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. 100m Sprint" maxLength={120} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Level">
              <Select value={d.level} onValueChange={(v) => set("level", v as EventLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{LEVEL_LABEL[l]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Gender">
              <Select value={d.gender} onValueChange={(v) => set("gender", v as EventGender)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{GENDER_LABEL[g]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Measured by">
              <Select value={d.measure} onValueChange={(v) => set("measure", v as MeasureType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEASURES.map((m) => <SelectItem key={m} value={m}>{MEASURE_LABEL[m]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Points multiplier">
              <Input type="number" step="0.5" min="0.5" max="5" value={d.points_multiplier} onChange={(e) => set("points_multiplier", Number(e.target.value))} />
            </Field>
            <Field label="Start time">
              <Input value={d.scheduled_time} onChange={(e) => set("scheduled_time", e.target.value)} placeholder="09:30" maxLength={10} />
            </Field>
            <Field label="Venue">
              <Input value={d.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Track" maxLength={60} />
            </Field>
          </div>
          <label className="flex items-center justify-between rounded-lg border px-3 py-2">
            <span>
              <span className="block text-sm font-semibold">Team event</span>
              <span className="block text-xs text-muted-foreground">Relays etc. — excluded from individual awards</span>
            </span>
            <Switch checked={d.is_team} onCheckedChange={(v) => set("is_team", v)} />
          </label>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>{event ? "Save changes" : "Create event"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/* ---------------- Points ---------------- */

function PointsAdmin() {
  const { pointsRows } = useSportsData();
  const qc = useQueryClient();
  const [rows, setRows] = useState<{ position: number; points: number }[]>([]);

  useEffect(() => {
    setRows(pointsRows.map((r) => ({ position: r.position, points: r.points })));
  }, [pointsRows]);

  const save = useMutation({
    mutationFn: async () => {
      if (rows.some((r) => !Number.isInteger(r.points) || r.points < 0)) throw new Error("Points must be whole numbers ≥ 0");
      const keep = rows.map((r) => r.position);
      const { error: upErr } = await supabase.from("points_scale").upsert(rows);
      if (upErr) throw upErr;
      const removed = pointsRows.filter((r) => !keep.includes(r.position)).map((r) => r.position);
      if (removed.length) {
        const { error } = await supabase.from("points_scale").delete().in("position", removed);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["points"] });
      toast.success("Points table saved — all totals updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">Points awarded for each finishing place. Changes recalculate every total instantly.</p>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.position} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-card">
            <span className="w-12 font-display text-lg font-bold">{ordinal(r.position)}</span>
            <Input
              type="number"
              min={0}
              value={r.points}
              onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, points: Number(e.target.value) } : x)))}
              className="w-24"
              aria-label={`Points for ${ordinal(r.position)}`}
            />
            <span className="text-sm text-muted-foreground">points</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setRows((p) => [...p, { position: (p.at(-1)?.position ?? 0) + 1, points: 0 }])}>
          <Plus /> Add place
        </Button>
        <Button variant="outline" disabled={rows.length <= 1} onClick={() => setRows((p) => p.slice(0, -1))}>
          Remove last
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Save points</Button>
      </div>
    </div>
  );
}

/* ---------------- Officials ---------------- */

function OfficialsAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const createAccount = useServerFn(createOfficialAccount);

  const people = useQuery({
    queryKey: ["admin", "people"],
    queryFn: async () => {
      const [{ data: profiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return (profiles ?? []).map((p) => {
        const r = (roles ?? []).filter((x) => x.user_id === p.id).map((x) => x.role);
        const role: AppRole = r.includes("admin") ? "admin" : r.includes("recorder") ? "recorder" : "viewer";
        return { ...p, role };
      });
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.rpc("set_user_role", { _user_id: userId, _role: role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "people"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [form, setForm] = useState({ displayName: "", email: "", password: "", role: "recorder" as AppRole });
  const create = useMutation({
    mutationFn: () => createAccount({ data: form }),
    onSuccess: (r) => {
      toast.success(`Account created for ${r.email}`);
      setForm({ displayName: "", email: "", password: "", role: "recorder" });
      qc.invalidateQueries({ queryKey: ["admin", "people"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Change who can record results. People who sign up themselves start as viewers.</p>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
          {(people.data ?? []).map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.display_name ?? "—"}{p.id === user?.id && " (you)"}</p>
                <p className="truncate text-xs text-muted-foreground">{p.email}</p>
              </div>
              <Select
                value={p.role}
                disabled={p.id === user?.id}
                onValueChange={(v) => setRole.mutate({ userId: p.id, role: v as AppRole })}
              >
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["admin", "recorder", "viewer"] as AppRole[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      </div>

      <form
        onSubmit={(e: FormEvent) => { e.preventDefault(); create.mutate(); }}
        className="h-fit space-y-3 rounded-xl border bg-card p-4 shadow-card"
      >
        <p className="flex items-center gap-2 font-display text-lg font-bold uppercase"><UserPlus className="size-5" /> Create official account</p>
        <p className="text-xs text-muted-foreground">Ready to use immediately — no email confirmation needed. Share the password with the official.</p>
        <Field label="Name"><Input required maxLength={80} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></Field>
        <Field label="Email"><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password (min 8)"><Input required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Role">
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["recorder", "admin", "viewer"] as AppRole[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create account"}</Button>
      </form>
    </div>
  );
}

/* ---------------- Data ---------------- */

function DataAdmin() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState("");
  const reset = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("reset_all_results");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setConfirm("");
      toast.success("All results cleared and events set back to scheduled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-lg space-y-3 rounded-xl border-2 border-destructive/40 bg-card p-4">
      <p className="font-display text-lg font-bold uppercase text-destructive">Reset all results</p>
      <p className="text-sm text-muted-foreground">
        Deletes every result and sets all events back to “Scheduled”. Events, the points table and accounts are kept. Use this after testing, before the real day.
        Export a CSV from the Reports page first if you need a copy.
      </p>
      <Label htmlFor="confirm-reset">Type RESET to confirm</Label>
      <Input id="confirm-reset" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <Button variant="destructive" disabled={confirm !== "RESET" || reset.isPending} onClick={() => reset.mutate()}>
        Reset results
      </Button>
    </div>
  );
}
