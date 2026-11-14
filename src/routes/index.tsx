import { useMemo, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Flag, ListChecks, Radio, Trophy } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
      <section className="relative overflow-hidden border-b border-border">
        <img src={trackImg} alt="" width={1920} height={768} className="absolute inset-0 h-full w-full object-cover opacity-35 saturate-50" />
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute inset-0 bg-scrim" />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-12 sm:pb-14 sm:pt-20">
          <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <CalendarDays className="size-3.5 text-primary" />
            Inter-House Sports Day · 20 Nov 2026
          </div>
          <h1 className="animate-rise mt-5 max-w-3xl text-5xl font-extrabold leading-[0.92] sm:text-7xl lg:text-8xl" style={{ animationDelay: "60ms" }}>
            Machabeng <span className="text-gradient">Sports Day</span>
          </h1>
          <p className="animate-rise mt-4 max-w-lg text-base text-muted-foreground sm:text-lg" style={{ animationDelay: "120ms" }}>
            Every result, every point, live from the field. Follow Ravens, Hawks, Eagles and Falcons as it happens.
          </p>

          <div className="animate-rise mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" style={{ animationDelay: "180ms" }}>
            <Stat icon={<Flag />} label="Events done" value={`${done}/${events.length}`} />
            <Stat icon={<Radio />} label="Running now" value={String(running.length)} highlight={running.length > 0} />
            <Stat icon={<ListChecks />} label="Results in" value={String(results.length)} />
            <Stat
              icon={<Trophy />}
              label="Leading"
              value={leader && leader.points > 0 ? HOUSE_META[leader.house].label : "—"}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1.45fr_1fr]">
        <section>
          <SectionTitle
            aside={
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-live animate-live" /> Updates live
              </span>
            }
          >
            House standings
          </SectionTitle>
          {isLoading ? <LoadingBlock /> : <Scoreboard standings={standings} />}
        </section>

        <div className="space-y-10">
          <section>
            <SectionTitle
              aside={
                <Link to="/events" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  All events <ArrowRight className="size-3.5" />
                </Link>
              }
            >
              On now
            </SectionTitle>
            {running.length === 0 ? (
              <EmptyState title="Nothing running">Events appear here when an official starts them.</EmptyState>
            ) : (
              <ul className="grid gap-2">
                {running.map((e) => (
                  <li key={e.id}>
                    <Link
                      to="/events/$eventId"
                      params={{ eventId: e.id }}
                      className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 shadow-card transition-colors hover:border-primary/50"
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
              <ul className="overflow-hidden rounded-2xl border bg-card shadow-card">
                {recent.map((r) => {
                  const ev = eventById.get(r.event_id);
                  if (!ev) return null;
                  return (
                    <li key={r.id} className="animate-flash border-b border-border last:border-b-0">
                      <Link to="/events/$eventId" params={{ eventId: ev.id }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                        <PositionMark position={r.position} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{r.participant_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {eventTitle(ev)} · {formatDistanceToNowStrict(new Date(r.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <HouseBadge house={r.house} />
                          <span className="text-xs font-semibold tabular text-primary">+{pointsFor(r.position, scale, ev.points_multiplier)}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <Link
            to="/reports"
            className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-primary/30 bg-accent p-5 transition-colors hover:border-primary/60"
          >
            <div>
              <p className="eyebrow text-primary">Awards</p>
              <p className="mt-1 font-display text-xl font-bold">Champions & final report</p>
            </div>
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-1">
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-card/70 p-4 backdrop-blur", highlight && "border-live/40")}>
      <div className={cn("mb-3 grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4", highlight && "bg-live/15 text-live")}>
        {icon}
      </div>
      <p className="truncate font-display text-2xl font-extrabold tabular leading-none sm:text-3xl">{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
