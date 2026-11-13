import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Flag, Lock, Play, Plus, Trash2, Unlock, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSportsData } from "@/hooks/use-sports-data";
import { useResultMutations } from "@/hooks/use-result-mutations";
import { pointsFor, rankByPerformance, type PointsScale } from "@/lib/scoring";
import {
  GENDER_LABEL,
  HOUSE_META,
  HOUSES,
  LEVEL_LABEL,
  MEASURE_HINT,
  MEASURE_LABEL,
  type EventStatus,
  type House,
  type SportEvent,
  type SportResult,
} from "@/lib/sports";
import { HouseBadge, HousePicker } from "@/components/sports/house";
import { PositionMark } from "@/components/sports/medal";
import { StatusBadge } from "@/components/sports/status-badge";
import { EmptyState, LoadingBlock, SectionTitle } from "@/components/sports/page";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event Results — Machabeng Sports Day 2026" },
      { name: "description", content: "Live placings, performances and house points for this Sports Day event." },
      { property: "og:title", content: "Event Results — Machabeng Sports Day 2026" },
      { property: "og:description", content: "Live placings, performances and house points for this Sports Day event." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventPage,
});

function sortResults(rows: SportResult[]) {
  return [...rows].sort((a, b) => {
    if (a.position && b.position) return a.position - b.position || a.created_at.localeCompare(b.created_at);
    if (a.position) return -1;
    if (b.position) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

function EventPage() {
  const { eventId } = Route.useParams();
  const { events, results, scale, isLoading } = useSportsData();
  const { canRecord, isAdmin } = useAuth();
  const event = events.find((e) => e.id === eventId);
  const rows = useMemo(() => sortResults(results.filter((r) => r.event_id === eventId)), [results, eventId]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <LoadingBlock />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <EmptyState title="Event not found">
          <Link to="/events" className="underline">Back to events</Link>
        </EmptyState>
      </div>
    );
  }

  const locked = event.status === "finalised";
  const canEdit = isAdmin || (canRecord && !locked);
  const houseTotals = HOUSES.map((h) => ({
    house: h,
    points: rows.filter((r) => r.house === h).reduce((s, r) => s + pointsFor(r.position, scale, event.points_multiplier), 0),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Events
      </Link>

      <header className="rounded-xl bg-ink p-5 text-chalk shadow-lift">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-signal">
              {LEVEL_LABEL[event.level]} · {GENDER_LABEL[event.gender]}
              {event.is_team && " · Team event"}
            </p>
            <h1 className="text-4xl font-extrabold uppercase leading-none sm:text-5xl">{event.name}</h1>
            <p className="mt-2 text-sm text-chalk/70">
              {[event.scheduled_time, event.venue, `Measured by ${MEASURE_LABEL[event.measure].toLowerCase()}`].filter(Boolean).join(" · ")}
              {Number(event.points_multiplier) !== 1 && ` · Points ×${Number(event.points_multiplier)}`}
            </p>
          </div>
          <StatusBadge status={event.status} className="text-sm" />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {houseTotals.map((t) => (
            <div key={t.house} className={cn("rounded-md px-2 py-1.5 text-center", HOUSE_META[t.house].solid)}>
              <p className="font-display text-xs font-semibold uppercase tracking-wider opacity-90">{HOUSE_META[t.house].label}</p>
              <p className="font-display text-2xl font-extrabold tabular leading-none">{t.points}</p>
            </div>
          ))}
        </div>
      </header>

      {canRecord && <StatusControls event={event} isAdmin={isAdmin} />}

      {canRecord && locked && !isAdmin && (
        <p className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm">
          <Lock className="size-4" /> This event is finalised. Ask an admin to reopen it to make changes.
        </p>
      )}

      {canEdit && <AddResultForm event={event} />}

      <section>
        <SectionTitle
          aside={
            canEdit && event.measure !== "placing" && rows.length > 1 ? <AutoRankButton event={event} rows={rows} /> : null
          }
        >
          Results
        </SectionTitle>
        {rows.length === 0 ? (
          <EmptyState title="No entries yet">
            {canEdit ? "Add the first participant above." : "Results will appear here live."}
          </EmptyState>
        ) : canEdit ? (
          <div className="space-y-2">
            {rows.map((r) => (
              <EditableRow key={r.id} row={r} event={event} scale={scale} rows={rows} />
            ))}
          </div>
        ) : (
          <ReadOnlyTable rows={rows} event={event} scale={scale} />
        )}
      </section>
    </div>
  );
}

function StatusControls({ event, isAdmin }: { event: SportEvent; isAdmin: boolean }) {
  const qc = useQueryClient();
  const setStatus = useMutation({
    mutationFn: async (status: EventStatus) => {
      const { error } = await supabase.from("events").update({ status }).eq("id", event.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const s = event.status;
  return (
    <div className="flex flex-wrap gap-2">
      {s === "scheduled" && (
        <Button variant="signal" size="lg" onClick={() => setStatus.mutate("in_progress")} disabled={setStatus.isPending}>
          <Play /> Start event
        </Button>
      )}
      {(s === "scheduled" || s === "in_progress") && (
        <Button size="lg" onClick={() => setStatus.mutate("completed")} disabled={setStatus.isPending}>
          <Flag /> Mark completed
        </Button>
      )}
      {s === "completed" && (
        <Button variant="outline" size="lg" onClick={() => setStatus.mutate("in_progress")} disabled={setStatus.isPending}>
          <Play /> Back to in progress
        </Button>
      )}
      {isAdmin && s !== "finalised" && (
        <Button variant="ink" size="lg" onClick={() => setStatus.mutate("finalised")} disabled={setStatus.isPending}>
          <Lock /> Finalise
        </Button>
      )}
      {isAdmin && s === "finalised" && (
        <Button variant="outline" size="lg" onClick={() => setStatus.mutate("completed")} disabled={setStatus.isPending}>
          <Unlock /> Reopen
        </Button>
      )}
    </div>
  );
}

function AddResultForm({ event }: { event: SportEvent }) {
  const { user } = useAuth();
  const { add } = useResultMutations();
  const [name, setName] = useState("");
  const [house, setHouse] = useState<House | null>(null);
  const [performance, setPerformance] = useState("");
  const [position, setPosition] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!house) { toast.error("Pick a house"); return; }
    const participant = name.trim() || (event.is_team ? `${HOUSE_META[house].label} team` : "");
    if (!participant) { toast.error("Enter the participant's name"); return; }
    const pos = position ? Number(position) : null;
    if (pos !== null && (!Number.isInteger(pos) || pos < 1 || pos > 50)) { toast.error("Position must be 1–50"); return; }
    await add.mutateAsync({
      event_id: event.id,
      participant_name: participant,
      house,
      performance: performance.trim() || null,
      position: pos,
      recorded_by: user?.id ?? null,
    });
    setName("");
    setPerformance("");
    setPosition("");
    if (event.is_team) setHouse(null);
    nameRef.current?.focus();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border-2 border-primary/30 bg-card p-4 shadow-card">
      <p className="eyebrow text-primary">Add entry</p>
      <Input
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={event.is_team ? "Team name (optional, e.g. Ravens A)" : "Full name"}
        className="h-12 text-base"
        maxLength={120}
        autoComplete="off"
      />
      <HousePicker value={house} onChange={setHouse} />
      <div className="grid grid-cols-[1fr_7rem_auto] gap-2">
        <Input
          value={performance}
          onChange={(e) => setPerformance(e.target.value)}
          placeholder={MEASURE_HINT[event.measure]}
          className="h-12 text-base"
          maxLength={40}
          inputMode={event.measure === "placing" ? "text" : "decimal"}
          aria-label={MEASURE_LABEL[event.measure]}
        />
        <Input
          value={position}
          onChange={(e) => setPosition(e.target.value.replace(/\D/g, ""))}
          placeholder="Place"
          className="h-12 text-center text-base"
          inputMode="numeric"
          aria-label="Position"
        />
        <Button type="submit" size="xl" disabled={add.isPending}>
          <Plus /> Add
        </Button>
      </div>
    </form>
  );
}

function AutoRankButton({ event, rows }: { event: SportEvent; rows: SportResult[] }) {
  const { update } = useResultMutations();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    const ranks = rankByPerformance(rows, event.measure);
    const changes = rows.filter((r) => (ranks.get(r.id) ?? null) !== r.position);
    if (changes.length === 0) { toast("Positions already match performances"); return; }
    setBusy(true);
    try {
      await Promise.all(changes.map((r) => update.mutateAsync({ id: r.id, patch: { position: ranks.get(r.id) ?? null } })));
      toast.success(`Ranked ${rows.length} entries by ${MEASURE_LABEL[event.measure].toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button size="sm" variant="outline" onClick={run} disabled={busy} title="Set positions from performances">
      <Wand2 /> Auto-rank
    </Button>
  );
}

function EditableRow({ row, event, scale, rows }: { row: SportResult; event: SportEvent; scale: PointsScale; rows: SportResult[] }) {
  const { update, remove } = useResultMutations();
  const [name, setName] = useState(row.participant_name);
  const [performance, setPerformance] = useState(row.performance ?? "");
  const [position, setPosition] = useState(row.position ? String(row.position) : "");
  const [focused, setFocused] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Accept changes from other officials unless this row is being edited right now.
  useEffect(() => {
    if (focused) return;
    setName(row.participant_name);
    setPerformance(row.performance ?? "");
    setPosition(row.position ? String(row.position) : "");
  }, [row.participant_name, row.performance, row.position, focused]);

  const commit = () => {
    setFocused(false);
    const patch: Partial<SportResult> = {};
    const n = name.trim();
    if (n && n !== row.participant_name) patch.participant_name = n;
    if (!n) setName(row.participant_name);
    const p = performance.trim() || null;
    if (p !== row.performance) patch.performance = p;
    const pos = position ? Number(position) : null;
    if (pos !== null && (pos < 1 || pos > 50)) {
      toast.error("Position must be 1–50");
      setPosition(row.position ? String(row.position) : "");
    } else if (pos !== row.position) patch.position = pos;
    if (Object.keys(patch).length) update.mutate({ id: row.id, patch });
  };

  const tie = row.position !== null && rows.some((r) => r.id !== row.id && r.position === row.position);
  const pts = pointsFor(row.position, scale, event.points_multiplier);
  const inputProps = {
    onFocus: () => setFocused(true),
    onBlur: commit,
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
    },
  };

  return (
    <div className={cn("rounded-lg border-l-4 bg-card p-2.5 shadow-card", HOUSE_META[row.house].border)}>
      <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2">
        <Input
          value={position}
          onChange={(e) => setPosition(e.target.value.replace(/\D/g, ""))}
          {...inputProps}
          className="h-11 text-center font-display text-xl font-bold"
          inputMode="numeric"
          placeholder="–"
          aria-label="Position"
        />
        <Input value={name} onChange={(e) => setName(e.target.value)} {...inputProps} className="h-11 text-base font-semibold" aria-label="Name" maxLength={120} />
        <div className="w-14 text-right">
          <p className="font-display text-xl font-bold tabular leading-none">{pts}</p>
          <p className="text-[10px] uppercase text-muted-foreground">pts</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_9rem_auto]">
        <HousePicker size="sm" value={row.house} onChange={(h) => h !== row.house && update.mutate({ id: row.id, patch: { house: h } })} />
        <Input
          value={performance}
          onChange={(e) => setPerformance(e.target.value)}
          {...inputProps}
          placeholder={MEASURE_HINT[event.measure]}
          className="h-8"
          aria-label={MEASURE_LABEL[event.measure]}
          maxLength={40}
        />
        <div className="flex items-center justify-end gap-2">
          {tie && <span className="rounded bg-signal px-1.5 py-0.5 text-[10px] font-bold uppercase text-signal-foreground">Tie</span>}
          {update.isSuccess && !focused && <Check className="size-4 text-primary" aria-label="Saved" />}
          {confirmDelete ? (
            <>
              <Button size="sm" variant="destructive" onClick={() => remove.mutate(row.id)}>Delete</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </>
          ) : (
            <Button size="icon" variant="ghost" className="size-8" onClick={() => setConfirmDelete(true)} aria-label="Delete entry">
              <Trash2 />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyTable({ rows, event, scale }: { rows: SportResult[]; event: SportEvent; scale: PointsScale }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-3 px-3 py-3">
          <PositionMark position={r.position} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{r.participant_name}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <HouseBadge house={r.house} />
              {r.performance && <span className="text-sm tabular text-muted-foreground">{r.performance}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold tabular leading-none">{pointsFor(r.position, scale, event.points_multiplier)}</p>
            <p className="text-[10px] uppercase text-muted-foreground">pts</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
