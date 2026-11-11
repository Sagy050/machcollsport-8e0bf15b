import { cn } from "@/lib/utils";
import { STATUS_LABEL, type EventStatus } from "@/lib/sports";

const STYLE: Record<EventStatus, string> = {
  scheduled: "bg-muted text-muted-foreground",
  in_progress: "bg-signal text-signal-foreground",
  completed: "bg-accent text-accent-foreground",
  finalised: "bg-ink text-chalk",
};

export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STYLE[status],
        className,
      )}
    >
      {status === "in_progress" && <span className="size-1.5 rounded-full bg-live animate-live" />}
      {STATUS_LABEL[status]}
    </span>
  );
}
