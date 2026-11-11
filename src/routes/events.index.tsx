import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSportsData } from "@/hooks/use-sports-data";
import { useAuth } from "@/hooks/use-auth";
import { GENDER_LABEL, LEVELS, LEVEL_LABEL, MEASURE_LABEL, STATUSES, STATUS_LABEL, type EventLevel, type EventStatus } from "@/lib/sports";
import { HouseDot } from "@/components/sports/house";
import { PageHeader, LoadingBlock, EmptyState } from "@/components/sports/page";
import { StatusBadge } from "@/components/sports/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Events Programme — Machabeng Sports Day 2026" },
      { name: "description", content: "Every Sports Day event with its level, start time, status and live results." },
      { property: "og:title", content: "Events Programme — Machabeng Sports Day 2026" },
      { property: "og:description", content: "Every Sports Day event with its level, start time, status and live results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventsPage,
});

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-sm font-semibold transition-colors",
        active ? "border-ink bg-ink text-chalk" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function EventsPage() {
  const { events, results, isLoading } = useSportsData();
  const { isAdmin, canRecord } = useAuth();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<EventLevel | "all">("all");
  const [status, setStatus] = useState<EventStatus | "all">("all");

  const counts = useMemo(() => {
    const m = new Map<string, { n: number; winner?: (typeof results)[number] }>();
    for (const r of results) {
      const c = m.get(r.event_id) ?? { n: 0 };
      c.n++;
      if (r.position === 1 && !c.winner) c.winner = r;
      m.set(r.event_id, c);
    }
    return m;
  }, [results]);

  const filtered = events.filter(
    (e) =>
      (level === "all" || e.level === level) &&
      (status === "all" || e.status === status) &&
      (!q || e.name.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <PageHeader eyebrow="Programme" title="Events">
        {isAdmin && (
          <Button asChild>
            <Link to="/admin"><Plus /> New event</Link>
          </Button>
        )}
      </PageHeader>

      {canRecord && (
        <p className="rounded-lg border-l-4 border-primary bg-accent px-4 py-2 text-sm text-accent-foreground">
          You're signed in as an official. Open any event to record results.
        </p>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search events…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={level === "all"} onClick={() => setLevel("all")}>All levels</Chip>
          {LEVELS.map((l) => (
            <Chip key={l} active={level === l} onClick={() => setLevel(l)}>{LEVEL_LABEL[l]}</Chip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={status === "all"} onClick={() => setStatus("all")}>Any status</Chip>
          {STATUSES.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{STATUS_LABEL[s]}</Chip>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No events match">Try a different filter.</EmptyState>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {filtered.map((e) => {
            const c = counts.get(e.id);
            return (
              <li key={e.id}>
                <Link
                  to="/events/$eventId"
                  params={{ eventId: e.id }}
                  className="group flex h-full items-stretch overflow-hidden rounded-lg border bg-card shadow-card transition-colors hover:border-primary"
                >
                  <div className="flex w-16 shrink-0 flex-col items-center justify-center bg-muted px-1 text-center">
                    <span className="font-display text-lg font-bold tabular leading-none">{e.scheduled_time ?? "—"}</span>
                  </div>
                  <div className="min-w-0 flex-1 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-lg font-bold uppercase leading-tight">{e.name}</p>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {LEVEL_LABEL[e.level]} · {GENDER_LABEL[e.gender]} · {MEASURE_LABEL[e.measure]}
                      {e.is_team && " · Team"}
                      {Number(e.points_multiplier) !== 1 && ` · ×${Number(e.points_multiplier)} pts`}
                      {e.venue && ` · ${e.venue}`}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs">
                      {c?.winner ? (
                        <>
                          <HouseDot house={c.winner.house} />
                          <span className="font-semibold">{c.winner.participant_name}</span>
                          <span className="text-muted-foreground">won · {c.n} entries</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{c?.n ? `${c.n} entries` : "No entries yet"}</span>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
