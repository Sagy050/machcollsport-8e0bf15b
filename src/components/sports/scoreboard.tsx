import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { HOUSE_META } from "@/lib/sports";
import type { HouseStanding } from "@/lib/scoring";
import { MedalCounts } from "./medal";

export function Scoreboard({ standings, compact }: { standings: HouseStanding[]; compact?: boolean }) {
  const top = Math.max(1, ...standings.map((s) => s.points));
  return (
    <ol className="grid gap-3">
      {standings.map((s, i) => {
        const meta = HOUSE_META[s.house];
        const leader = s.rank === 1 && s.points > 0;
        return (
          <li
            key={s.house}
            style={{ animationDelay: `${i * 70}ms` }}
            className={cn(
              "animate-rise relative overflow-hidden rounded-2xl border bg-card shadow-card",
              leader && "border-gold/50",
            )}
          >
            <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-r to-transparent to-60%", meta.glow)} />
            <div className={cn("absolute inset-y-0 left-0 w-1", meta.bar)} />
            <div className={cn("relative flex items-center gap-4 pl-5 pr-4", compact ? "py-3" : "py-4 sm:py-5")}>
              <span
                className={cn(
                  "w-8 shrink-0 text-center font-display font-extrabold tabular leading-none text-muted-foreground",
                  compact ? "text-2xl" : "text-3xl sm:text-4xl",
                  leader && "text-gold",
                )}
              >
                {s.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={cn("truncate font-display font-bold", compact ? "text-lg" : "text-xl sm:text-2xl")}>{meta.label}</h3>
                  {leader && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">
                      <Crown className="size-3" /> Leading
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-700", meta.bar)}
                      style={{ width: `${(s.points / top) * 100}%` }}
                    />
                  </div>
                  <MedalCounts gold={s.gold} silver={s.silver} bronze={s.bronze} />
                </div>
              </div>
              <div key={s.points} className="animate-flash rounded-xl px-2 py-1 text-right">
                <span className={cn("block font-display font-extrabold tabular leading-none", compact ? "text-3xl" : "text-4xl sm:text-5xl")}>
                  {s.points}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">points</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
