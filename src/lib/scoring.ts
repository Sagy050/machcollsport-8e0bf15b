import type { EventLevel, House, MeasureType, PointsRow, SportEvent, SportResult } from "./sports";
import { HOUSES } from "./sports";

export type PointsScale = Map<number, number>;

export function buildScale(rows: PointsRow[]): PointsScale {
  return new Map(rows.map((r) => [r.position, r.points]));
}

/** Points earned for a finishing position. Ties share the same position and both earn its points. */
export function pointsFor(position: number | null | undefined, scale: PointsScale, multiplier = 1) {
  if (!position || position < 1) return 0;
  const base = scale.get(position) ?? 0;
  return Math.round(base * Number(multiplier) * 100) / 100;
}

/** Parse a performance string to a number. Times accept "12.45", "1:02.30", "1:02:03". */
export function parsePerformance(value: string | null | undefined, measure: MeasureType): number | null {
  if (!value) return null;
  const v = value.trim().replace(",", ".").replace(/[a-z\s]+$/i, "");
  if (!v) return null;
  if (measure === "time" && v.includes(":")) {
    const parts = v.split(":").map(Number);
    if (parts.some((p) => Number.isNaN(p))) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Lower is better for time; higher is better for distance, height and score. */
export function lowerIsBetter(measure: MeasureType) {
  return measure === "time";
}

/**
 * Assign positions from performances. Equal performances share a position
 * (standard competition ranking: 1, 2, 2, 4). Rows without a parsable performance get null.
 */
export function rankByPerformance<T extends { id: string; performance: string | null }>(
  rows: T[],
  measure: MeasureType,
): Map<string, number | null> {
  const parsed = rows.map((r) => ({ id: r.id, value: parsePerformance(r.performance, measure) }));
  const valid = parsed.filter((p): p is { id: string; value: number } => p.value !== null);
  valid.sort((a, b) => (lowerIsBetter(measure) ? a.value - b.value : b.value - a.value));
  const out = new Map<string, number | null>();
  parsed.forEach((p) => out.set(p.id, null));
  valid.forEach((p, i) => {
    const prev = valid[i - 1];
    const position = prev && prev.value === p.value ? (out.get(prev.id) as number) : i + 1;
    out.set(p.id, position);
  });
  return out;
}

export interface HouseStanding {
  house: House;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
  rank: number;
}

export function houseStandings(
  events: SportEvent[],
  results: SportResult[],
  scale: PointsScale,
): HouseStanding[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  const totals = new Map<House, HouseStanding>(
    HOUSES.map((h) => [h, { house: h, points: 0, gold: 0, silver: 0, bronze: 0, rank: 0 }]),
  );
  for (const r of results) {
    const ev = byId.get(r.event_id);
    if (!ev) continue;
    const t = totals.get(r.house)!;
    t.points += pointsFor(r.position, scale, ev.points_multiplier);
    if (r.position === 1) t.gold++;
    if (r.position === 2) t.silver++;
    if (r.position === 3) t.bronze++;
  }
  const list = [...totals.values()].map((t) => ({ ...t, points: Math.round(t.points * 100) / 100 }));
  list.sort(
    (a, b) =>
      b.points - a.points || b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze ||
      HOUSES.indexOf(a.house) - HOUSES.indexOf(b.house),
  );
  list.forEach((t, i) => {
    const prev = list[i - 1];
    t.rank = prev && prev.points === t.points ? prev.rank : i + 1;
  });
  return list;
}

export interface AthleteSummary {
  key: string;
  name: string;
  house: House;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
  events: number;
  levels: EventLevel[];
}

export function normaliseName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function compareAthletes(a: AthleteSummary, b: AthleteSummary) {
  return (
    b.points - a.points || b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze ||
    a.name.localeCompare(b.name)
  );
}

/** Individual totals. Team events (relays) are excluded from individual awards. */
export function athleteSummaries(
  events: SportEvent[],
  results: SportResult[],
  scale: PointsScale,
  filter?: (e: SportEvent) => boolean,
): AthleteSummary[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  const map = new Map<string, AthleteSummary>();
  for (const r of results) {
    const ev = byId.get(r.event_id);
    if (!ev || ev.is_team) continue;
    if (filter && !filter(ev)) continue;
    const key = `${r.house}:${normaliseName(r.participant_name)}`;
    let a = map.get(key);
    if (!a) {
      a = { key, name: r.participant_name.trim(), house: r.house, points: 0, gold: 0, silver: 0, bronze: 0, events: 0, levels: [] };
      map.set(key, a);
    }
    a.points += pointsFor(r.position, scale, ev.points_multiplier);
    a.events++;
    if (r.position === 1) a.gold++;
    if (r.position === 2) a.silver++;
    if (r.position === 3) a.bronze++;
    if (!a.levels.includes(ev.level)) a.levels.push(ev.level);
  }
  return [...map.values()].filter((a) => a.points > 0 || a.gold + a.silver + a.bronze > 0).sort(compareAthletes);
}

export function bestPerHouse(athletes: AthleteSummary[]): Record<House, AthleteSummary | null> {
  const out = { ravens: null, hawks: null, eagles: null, falcons: null } as Record<House, AthleteSummary | null>;
  for (const a of athletes) {
    if (!out[a.house]) out[a.house] = a;
  }
  return out;
}

export function levelChampions(
  events: SportEvent[],
  results: SportResult[],
  scale: PointsScale,
): { level: EventLevel; champion: AthleteSummary | null; runnerUp: AthleteSummary | null }[] {
  const levels: EventLevel[] = ["junior", "intermediate", "senior"];
  return levels.map((level) => {
    const list = athleteSummaries(events, results, scale, (e) => e.level === level);
    return { level, champion: list[0] ?? null, runnerUp: list[1] ?? null };
  });
}
