import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { HOUSE_META, ordinal } from "@/lib/sports";
import type { HouseStanding } from "@/lib/scoring";
import { MedalCounts } from "./medal";

export function Scoreboard({ standings, compact }: { standings: HouseStanding[]; compact?: boolean }) {
  const top = Math.max(1, ...standings.map((s) => s.points));
  return (
    <ol className="grid gap-3">
      {standings.map((s) => {
        const meta = HOUSE_META[s.house];
        const leader = s.rank === 1 && s.points > 0;
        return (
          <li
            key={s.house}
            className={cn(
              "relative overflow-hidden rounded-xl border bg-card shadow-card",
              leader && "ring-2 ring-gold",
            )}
          >
            <div className="flex items-stretch">
              <div className={cn("flex w-16 shrink-0 flex-col items-center justify-center sm:w-20", meta.solid)}>
                <span className="font-display text-3xl font-extrabold leading-none sm:text-4xl">{s.rank}</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">{ordinal(s.rank).replace(/\d+/, "")}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className={cn("font-display font-bold uppercase tracking-wide", compact ? "text-xl" : "text-2xl sm:text-3xl")}>
                      {meta.label}
                    </h3>
                    {leader && <Crown className="size-5 text-gold" aria-label="Leading" />}
                  </div>
                  <div key={s.points} className="animate-flash rounded-md px-2 text-right">
                    <span className={cn("font-display font-extrabold tabular leading-none", compact ? "text-3xl" : "text-4xl sm:text-5xl")}>
                      {s.points}
                    </span>
                    <span className="ml-1 text-xs font-semibold uppercase text-muted-foreground">pts</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-700", meta.solid)}
                      style={{ width: `${(s.points / top) * 100}%` }}
                    />
                  </div>
                  <MedalCounts gold={s.gold} silver={s.silver} bronze={s.bronze} />
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
