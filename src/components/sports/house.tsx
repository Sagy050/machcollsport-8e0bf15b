import { cn } from "@/lib/utils";
import { HOUSES, HOUSE_META, type House } from "@/lib/sports";

const TINT: Record<House, string> = {
  ravens: "border-ravens/35 bg-ravens/15 text-ravens",
  hawks: "border-hawks/35 bg-hawks/15 text-hawks",
  eagles: "border-eagles/35 bg-eagles/15 text-eagles",
  falcons: "border-falcons/35 bg-falcons/15 text-falcons",
};

export function HouseDot({ house, className }: { house: House; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", HOUSE_META[house].bar, className)} aria-hidden />;
}

export function HouseBadge({ house, className }: { house: House; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TINT[house],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", HOUSE_META[house].bar)} />
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
    <div role="radiogroup" aria-label="House" className="grid grid-cols-4 gap-1.5">
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
              "rounded-lg border font-semibold transition-all disabled:opacity-50",
              size === "sm" ? "h-8 px-1 text-xs" : "h-11 px-2 text-sm",
              active
                ? cn(HOUSE_META[h].solid, "border-transparent shadow-card")
                : "border-input bg-card/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {HOUSE_META[h].label}
          </button>
        );
      })}
    </div>
  );
}
