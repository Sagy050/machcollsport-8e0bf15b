import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSportsData } from "@/hooks/use-sports-data";
import { athleteSummaries, bestPerHouse, houseStandings, levelChampions, pointsFor, type AthleteSummary } from "@/lib/scoring";
import { HOUSES, HOUSE_META, LEVEL_LABEL, eventTitle, ordinal } from "@/lib/sports";
import { downloadCsv } from "@/lib/export";
import { HouseBadge } from "@/components/sports/house";
import { MedalCounts, PositionMark } from "@/components/sports/medal";
import { EmptyState, LoadingBlock, PageHeader, SectionTitle } from "@/components/sports/page";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Final Results & Awards — Machabeng Sports Day 2026" },
      { name: "description", content: "Overall house ranking, best performers, top athletes and age-group champions." },
      { property: "og:title", content: "Final Results & Awards — Machabeng Sports Day 2026" },
      { property: "og:description", content: "Overall house ranking, best performers, top athletes and age-group champions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { events, results, scale, isLoading } = useSportsData();
  const standings = useMemo(() => houseStandings(events, results, scale), [events, results, scale]);
  const athletes = useMemo(() => athleteSummaries(events, results, scale), [events, results, scale]);
  const best = useMemo(() => bestPerHouse(athletes), [athletes]);
  const champs = useMemo(() => levelChampions(events, results, scale), [events, results, scale]);
  const finalised = events.filter((e) => e.status === "finalised").length;
  const allFinal = events.length > 0 && finalised === events.length;

  const exportAll = () => {
    const evById = new Map(events.map((e) => [e.id, e]));
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`sports-day-standings-${date}.csv`, [
      ["Rank", "House", "Points", "Gold", "Silver", "Bronze"],
      ...standings.map((s) => [s.rank, HOUSE_META[s.house].label, s.points, s.gold, s.silver, s.bronze]),
      [],
      ["Top athletes"],
      ["Rank", "Name", "House", "Points", "Gold", "Silver", "Bronze", "Events"],
      ...athletes.map((a, i) => [i + 1, a.name, HOUSE_META[a.house].label, a.points, a.gold, a.silver, a.bronze, a.events]),
      [],
      ["All results"],
      ["Event", "Level", "Gender", "Status", "Position", "Name", "House", "Performance", "Points"],
      ...results
        .map((r) => ({ r, e: evById.get(r.event_id) }))
        .filter((x) => x.e)
        .sort((a, b) => a.e!.name.localeCompare(b.e!.name) || (a.r.position ?? 99) - (b.r.position ?? 99))
        .map(({ r, e }) => [
          e!.name, LEVEL_LABEL[e!.level], e!.gender, e!.status, r.position ?? "", r.participant_name,
          HOUSE_META[r.house].label, r.performance ?? "", pointsFor(r.position, scale, e!.points_multiplier),
        ]),
    ]);
  };

  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-8"><LoadingBlock /></div>;

  const winner = standings[0];

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <PageHeader eyebrow={allFinal ? "Official results" : `Provisional · ${finalised}/${events.length} events finalised`} title="Results & Awards">
        <Button variant="outline" onClick={() => window.print()} className="no-print"><Printer /> Print</Button>
        <Button onClick={exportAll} className="no-print"><Download /> Export CSV</Button>
      </PageHeader>

      {/* Podium */}
      <section>
        <SectionTitle>Overall house ranking</SectionTitle>
        {winner && winner.points > 0 && (
          <div className={cn("mb-4 flex items-center gap-4 rounded-xl p-5 shadow-lift", HOUSE_META[winner.house].solid)}>
            <Trophy className="size-12 shrink-0" />
            <div>
              <p className="eyebrow opacity-80">{allFinal ? "Champions" : "Currently leading"}</p>
              <p className="font-display text-5xl font-extrabold uppercase leading-none">{HOUSE_META[winner.house].label}</p>
              <p className="mt-1 font-semibold tabular">{winner.points} points</p>
            </div>
          </div>
        )}
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">Rank</th><th className="px-3 py-2">House</th><th className="px-3 py-2 text-right">Points</th><th className="px-3 py-2 text-right">Medals</th></tr>
            </thead>
            <tbody className="divide-y">
              {standings.map((s) => (
                <tr key={s.house}>
                  <td className="px-3 py-2.5 font-display text-lg font-bold">{ordinal(s.rank)}</td>
                  <td className="px-3 py-2.5"><HouseBadge house={s.house} className="text-sm" /></td>
                  <td className="px-3 py-2.5 text-right font-display text-2xl font-bold tabular">{s.points}</td>
                  <td className="px-3 py-2.5 text-right"><MedalCounts gold={s.gold} silver={s.silver} bronze={s.bronze} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle>Most valuable athlete per house</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOUSES.map((h) => {
            const a = best[h];
            return (
              <div key={h} className={cn("rounded-xl border-t-8 bg-card p-4 shadow-card", HOUSE_META[h].border)}>
                <p className="eyebrow text-muted-foreground">{HOUSE_META[h].label}</p>
                {a ? (
                  <>
                    <p className="mt-1 font-display text-2xl font-bold uppercase leading-tight">{a.name}</p>
                    <p className="text-sm tabular">{a.points} pts · {a.events} event{a.events === 1 ? "" : "s"}</p>
                    <div className="mt-2"><MedalCounts gold={a.gold} silver={a.silver} bronze={a.bronze} /></div>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No individual points yet</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle>Age-group champions</SectionTitle>
        <div className="grid gap-3 md:grid-cols-3">
          {champs.map((c) => (
            <div key={c.level} className="rounded-xl border bg-card p-4 shadow-card">
              <p className="eyebrow text-primary">{LEVEL_LABEL[c.level]} champion</p>
              {c.champion ? (
                <>
                  <AthleteLine a={c.champion} big />
                  {c.runnerUp && <div className="mt-2 border-t pt-2 text-sm"><span className="text-muted-foreground">Runner-up: </span><AthleteLine a={c.runnerUp} /></div>}
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No results yet</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle aside={<span className="text-xs text-muted-foreground">Individual events only</span>}>Top athletes overall</SectionTitle>
        {athletes.length === 0 ? (
          <EmptyState title="No individual results yet" />
        ) : (
          <ol className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
            {athletes.slice(0, 10).map((a, i) => (
              <li key={a.key} className="flex items-center gap-3 px-3 py-2.5">
                <PositionMark position={i + 1} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.levels.map((l) => LEVEL_LABEL[l]).join(", ")} · {a.events} event{a.events === 1 ? "" : "s"}</p>
                </div>
                <HouseBadge house={a.house} />
                <MedalCounts gold={a.gold} silver={a.silver} bronze={a.bronze} />
                <span className="w-14 text-right font-display text-xl font-bold tabular">{a.points}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <SectionTitle>Event winners</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {events.map((e) => {
            const podium = results
              .filter((r) => r.event_id === e.id && r.position && r.position <= 3)
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            return (
              <div key={e.id} className="rounded-lg border bg-card p-3 shadow-card">
                <p className="font-display font-bold uppercase">{eventTitle(e)}</p>
                {podium.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No placings yet</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {podium.map((r) => (
                      <li key={r.id} className="flex items-center gap-2 text-sm">
                        <PositionMark position={r.position} className="size-6 text-sm" />
                        <span className="flex-1 truncate">{r.participant_name}</span>
                        {r.performance && <span className="tabular text-muted-foreground">{r.performance}</span>}
                        <HouseBadge house={r.house} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function AthleteLine({ a, big }: { a: AthleteSummary; big?: boolean }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", big && "mt-1")}>
      <span className={cn("font-semibold", big && "font-display text-2xl font-bold uppercase")}>{a.name}</span>
      <HouseBadge house={a.house} />
      <span className="text-sm tabular text-muted-foreground">{a.points} pts</span>
    </span>
  );
}
