import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Shield, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABEL } from "@/lib/sports";
import type { LiveStatus } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Standings" },
  { to: "/events", label: "Events" },
  { to: "/reports", label: "Reports" },
  { to: "/guide", label: "Guide" },
] as const;

const linkBase = "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors";
const linkInactive = "text-muted-foreground hover:text-foreground";
const linkActive = "bg-foreground text-background";

export function SiteHeader({ live }: { live: LiveStatus }) {
  const { user, role, displayName, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const links = [...NAV, ...(isAdmin ? ([{ to: "/admin", label: "Admin" }] as const) : [])];

  return (
    <header className="no-print glass sticky top-0 z-40 border-b border-border">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-primary font-display text-sm font-extrabold text-primary-foreground shadow-glow">
            MC
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block font-display text-[15px] font-bold">Sports Day</span>
            <span className="block text-[11px] text-muted-foreground">Machabeng College · 2026</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 rounded-full border border-border bg-card/60 p-1 md:flex">
          {links.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className={linkBase}
              activeProps={{ className: linkActive }}
              inactiveProps={{ className: linkInactive }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
              live === "live" ? "border-live/40 bg-live/10 text-live" : "border-border text-muted-foreground",
            )}
            title={live === "live" ? "Receiving live updates" : live === "offline" ? "Reconnecting…" : "Connecting…"}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                live === "live" ? "bg-live animate-live" : live === "offline" ? "bg-muted-foreground" : "bg-primary animate-live",
              )}
            />
            {live === "live" ? "Live" : live === "offline" ? "Offline" : "Connecting"}
          </span>

          {!loading && !user && (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-full">
                  <UserRound />
                  <span className="hidden max-w-28 truncate sm:inline">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="truncate">{user.email}</div>
                  <div className="text-xs font-normal text-muted-foreground">{role ? ROLE_LABEL[role] : "No role"}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem onSelect={() => navigate({ to: "/admin" })}>
                    <Shield /> Admin panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={async () => {
                    await signOut();
                    navigate({ to: "/", replace: true });
                  }}
                >
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5 md:hidden">
        {links.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            className={cn(linkBase, "border")}
            activeProps={{ className: cn(linkActive, "border-foreground") }}
            inactiveProps={{ className: cn(linkInactive, "border-border bg-card/60") }}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
