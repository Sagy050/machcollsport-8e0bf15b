import { cn } from "@/lib/utils";
import { STATUS_LABEL, type EventStatus } from "@/lib/sports";

const STYLE: Record<EventStatus, string> = {
  scheduled: "border-border bg-muted/60 text-muted-foreground",
  in_progress: "border-live/40 bg-live/15 text-live",
  completed: "border-primary/30 bg-primary/10 text-primary",
  finalised: "border-foreground/20 bg-foreground/10 text-foreground",
};

export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STYLE[status],
        className,
      )}
    >
      {status === "in_progress" && <span className="size-1.5 rounded-full bg-live animate-live" />}
      {STATUS_LABEL[status]}
    </span>
  );
}
