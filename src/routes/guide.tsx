import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { pointsQuery } from "@/lib/queries";
import { ordinal } from "@/lib/sports";
import { PageHeader, SectionTitle } from "@/components/sports/page";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "How It Works — Machabeng Sports Day 2026" },
      { name: "description", content: "Points system, roles and how officials record results on Sports Day." },
      { property: "og:title", content: "How It Works — Machabeng Sports Day 2026" },
      { property: "og:description", content: "Points system, roles and how officials record results on Sports Day." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Guide,
});

function Guide() {
  const { data: scale = [] } = useQuery(pointsQuery);
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <PageHeader eyebrow="Documentation" title="How it works" />

      <section>
        <SectionTitle>Points system</SectionTitle>
        <p className="mb-3 text-sm text-muted-foreground">
          Every placing earns points for the athlete's house. Places outside the table earn 0. Team events (e.g. relays) can carry a
          multiplier set by the admin — the 4×100m relay is worth double. Tied athletes share the same place and each earn its points.
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {scale.map((p) => (
            <div key={p.position} className="rounded-lg border bg-card p-2 text-center shadow-card">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{ordinal(p.position)}</p>
              <p className="font-display text-3xl font-extrabold tabular leading-none">{p.points}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          House ranking is by total points; ties are broken by golds, then silvers, then bronzes. Individual awards count individual events only.
        </p>
      </section>

      <section className="space-y-3">
        <SectionTitle>Roles</SectionTitle>
        <ul className="space-y-2 text-sm">
          <li><strong>Spectators</strong> — no login needed. See live standings, events and awards.</li>
          <li><strong>Recorders</strong> — start events, add and edit entries, mark events completed.</li>
          <li><strong>Admins</strong> — everything recorders can do, plus create/edit/delete events, edit the points table, manage officials, finalise (lock) events and reset data.</li>
        </ul>
        <p className="text-sm text-muted-foreground">The first account ever created becomes the admin. Anyone else who signs up is a viewer until an admin promotes them.</p>
      </section>

      <section className="space-y-3">
        <SectionTitle>Recording on the field</SectionTitle>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>Sign in, open <strong>Events</strong> and tap your event.</li>
          <li>Tap <strong>Start event</strong> so spectators see it under “On now”.</li>
          <li>For each athlete: type the name, tap the house, enter time/distance and place, then <strong>Add</strong>. The name box is ready for the next athlete straight away.</li>
          <li>Didn't enter places? Tap <strong>Auto-rank</strong> to set places from the performances (fastest time, or longest/highest mark wins).</li>
          <li>Fix any entry by editing it in place — changes save when you leave the box. Every other screen updates within a second.</li>
          <li>Tap <strong>Mark completed</strong>. An admin then checks and <strong>Finalises</strong> it, which locks it.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <SectionTitle>Architecture</SectionTitle>
        <ul className="space-y-2 text-sm">
          <li><strong>Front end:</strong> React with TanStack Start, Tailwind CSS. Mobile-first so officials can record on a phone.</li>
          <li><strong>Back end:</strong> Lovable Cloud — a managed PostgreSQL database with authentication and real-time change feeds.</li>
          <li><strong>Real time:</strong> every device subscribes to changes on events, results and points. When anyone saves, all screens refresh automatically; on reconnect the app re-syncs.</li>
          <li><strong>Concurrency:</strong> each entry is its own record, so several officials can work on the same or different events at once without overwriting each other.</li>
          <li><strong>Security:</strong> database row-level rules enforce roles — only recorders/admins can write, finalised events are locked for recorders, and only admins manage events, points and users.</li>
          <li><strong>Scoring:</strong> points are calculated from the shared points table on every device, so changing the table updates every total consistently.</li>
        </ul>
      </section>
    </div>
  );
}
