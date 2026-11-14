import { cn } from "@/lib/utils";

const COLORS: Record<number, string> = {
  1: "bg-gold text-house-foreground",
  2: "bg-silver text-house-foreground",
  3: "bg-bronze text-house-foreground",
};

export function PositionMark({ position, className }: { position: number | null; className?: string }) {
  if (!position) return <span className={cn("inline-flex size-9 items-center justify-center text-muted-foreground", className)}>–</span>;
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl font-display text-base font-bold tabular",
        COLORS[position] ?? "border border-border bg-muted text-foreground",
        className,
      )}
    >
      {position}
    </span>
  );
}

export function MedalCounts({ gold, silver, bronze }: { gold: number; silver: number; bronze: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-xs font-medium tabular text-muted-foreground">
      <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-gold" />{gold}</span>
      <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-silver" />{silver}</span>
      <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-bronze" />{bronze}</span>
    </span>
  );
}
