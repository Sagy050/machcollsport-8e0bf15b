import { cn } from "@/lib/utils";
import { HOUSES, HOUSE_META, type House } from "@/lib/sports";

export function HouseDot({ house, className }: { house: House; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", HOUSE_META[house].solid, className)} aria-hidden />;
}

export function HouseBadge({ house, className }: { house: House; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 font-display text-xs font-semibold uppercase tracking-wider",
        HOUSE_META[house].solid,
        className,
      )}
    >
      {HOUSE_META[house].label}
    </span>
  );
}

export function HousePicker({
  value,
  onChange,
  size = "md",
  disabled,
}: {
  value: House | null;
  onChange: (h: House) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="House" className="grid grid-cols-4 gap-1">
      {HOUSES.map((h) => {
        const active = value === h;
        return (
          <button
            key={h}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(h)}
            className={cn(
              "rounded-md border-2 font-display font-semibold uppercase tracking-wide transition-all disabled:opacity-50",
              size === "sm" ? "h-8 px-1 text-xs" : "h-11 px-2 text-sm",
              active
                ? cn(HOUSE_META[h].solid, HOUSE_META[h].border, "shadow-card")
                : cn("border-border bg-card text-muted-foreground hover:border-foreground/30"),
            )}
          >
            {HOUSE_META[h].label}
          </button>
        );
      })}
    </div>
  );
}
