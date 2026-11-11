import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import trackImg from "@/assets/track-lanes.jpg";
import { useSportsData } from "@/hooks/use-sports-data";
import { houseStandings, pointsFor } from "@/lib/scoring";
import { HOUSE_META, eventTitle } from "@/lib/sports";
import { Scoreboard } from "@/components/sports/scoreboard";
import { LoadingBlock, SectionTitle, EmptyState } from "@/components/sports/page";
import { HouseBadge } from "@/components/sports/house";
import { PositionMark } from "@/components/sports/medal";
import { StatusBadge } from "@/components/sports/status-badge";
import { formatDistanceToNowStrict } from "date-fns";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live House Standings — Machabeng Sports Day 2026" },
      { name: "description", content: "Live scores for Ravens, Hawks, Eagles and Falcons at the Machabeng College Inter-House Sports Day." },
      { property: "og:title", content: "Live House Standings — Machabeng Sports Day 2026" },
      { property: "og:description", content: "Live scores for Ravens, Hawks, Eagles and Falcons at the Machabeng College Inter-House Sports Day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { events, results, scale, isLoading } = useSportsData();
  const standings = useMemo(() => houseStandings(events, results, scale), [events, results, scale]);
  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const done = events.filter((e) => e.status === "completed" || e.status === "finalised").length;
  const running = events.filter((e) => e.status === "in_progress");
  const recent = useMemo(
    () =>
      [...results]
        .filter((r) => r.position)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 10),
    [results],
  );
  const leader = standings[0];

  return (
    <div>
      <section className="relative overflow-hidden bg-ink text-chalk">
        <img src={trackImg} alt="" width={1920} height={768} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-scrim" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <p className="eyebrow text-signal">Inter-House Sports Day · 20 Nov 2026</p>
          <h1 className="mt-2 max-w-xl text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">
            Machabeng<br />College
          </h1>
          <div className="mt-6 flex flex-wrap gap-6 text-sm">
            <Stat label="Events done" value={`${done}/${events.length}`} />
            <Stat label="Running now" value={String(running.length)} />
            <Stat label="Results in" value={String(results.length)} />
            {leader && leader.points > 0 && <Stat label="Leading" value={HOUSE_META[leader.house].label} />}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionTitle aside={<span className="text-xs text-muted-foreground">Updates live</span>}>House standings</SectionTitle>
          {isLoading ? <LoadingBlock /> : <Scoreboard standings={standings} />}
        </section>

        <div className="space-y-8">
          <section>
            <SectionTitle aside={<Link to="/events" className="text-xs font-semibold text-primary">All events</Link>}>On now</SectionTitle>
            {running.length === 0 ? (
              <EmptyState title="Nothing running">Events appear here when an official starts them.</EmptyState>
            ) : (
              <ul className="grid gap-2">
                {running.map((e) => (
                  <li key={e.id}>
                    <Link
                      to="/events/$eventId"
                      params={{ eventId: e.id }}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 shadow-card hover:border-primary"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{eventTitle(e)}</p>
                        <p className="text-xs text-muted-foreground">{[e.scheduled_time, e.venue].filter(Boolean).join(" · ")}</p>
                      </div>
                      <StatusBadge status={e.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionTitle>Latest results</SectionTitle>
            {recent.length === 0 ? (
              <EmptyState title="No results yet">Placings show up here the moment they're recorded.</EmptyState>
            ) : (
              <ul className="divide-y rounded-lg border bg-card shadow-card">
                {recent.map((r) => {
                  const ev = eventById.get(r.event_id);
                  if (!ev) return null;
                  return (
                    <li key={r.id} className="animate-flash">
                      <Link to="/events/$eventId" params={{ eventId: ev.id }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60">
                        <PositionMark position={r.position} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{r.participant_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {eventTitle(ev)} · {formatDistanceToNowStrict(new Date(r.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <HouseBadge house={r.house} />
                          <span className="text-xs font-semibold tabular">+{pointsFor(r.position, scale, ev.points_multiplier)}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <Link to="/reports" className="flex items-center justify-between rounded-lg bg-ink px-4 py-3 font-display font-semibold uppercase tracking-wide text-chalk">
            Awards & final report <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-3xl font-bold tabular leading-none">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-chalk/70">{label}</p>
    </div>
  );
}
