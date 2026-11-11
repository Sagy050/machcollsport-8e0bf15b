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

export function SiteHeader({ live }: { live: LiveStatus }) {
  const { user, role, displayName, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="no-print sticky top-0 z-40 border-b border-ink/10 bg-ink text-chalk">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-signal font-display text-sm font-extrabold text-signal-foreground">
            MC
          </span>
          <span className="hidden leading-none sm:block">
            <span className="block font-display text-base font-bold uppercase tracking-wide">Sports Day</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-chalk/60">Machabeng 2026</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-md px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-chalk/70 transition-colors hover:text-chalk"
              activeProps={{ className: "bg-chalk/10 text-chalk" }}
            >
              {n.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-md px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-chalk/70 transition-colors hover:text-chalk"
              activeProps={{ className: "bg-chalk/10 text-chalk" }}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            title={live === "live" ? "Receiving live updates" : live === "offline" ? "Reconnecting…" : "Connecting…"}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                live === "live" ? "bg-live animate-live" : live === "offline" ? "bg-chalk/40" : "bg-signal",
              )}
            />
            <span className="hidden sm:inline">{live === "live" ? "Live" : live === "offline" ? "Offline" : "…"}</span>
          </span>

          {!loading && !user && (
            <Button asChild size="sm" variant="signal">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="text-chalk hover:bg-chalk/10 hover:text-chalk">
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
      <nav className="flex gap-1 overflow-x-auto border-t border-chalk/10 px-2 py-1.5 md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            className="shrink-0 rounded-md px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-chalk/70"
            activeProps={{ className: "bg-chalk/10 text-chalk" }}
          >
            {n.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            to="/admin"
            className="shrink-0 rounded-md px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-chalk/70"
            activeProps={{ className: "bg-chalk/10 text-chalk" }}
          >
            Admin
          </Link>
        )}
      </nav>
    </header>
  );
}
