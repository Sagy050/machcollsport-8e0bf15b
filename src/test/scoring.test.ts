import { describe, expect, it } from "vitest";
import {
  athleteSummaries,
  bestPerHouse,
  buildScale,
  houseStandings,
  parsePerformance,
  pointsFor,
  rankByPerformance,
} from "@/lib/scoring";
import type { SportEvent, SportResult } from "@/lib/sports";

// Default points table: 1st=10, 2nd=8, 3rd=6, 4th=5, 5th=4, 6th=3, 7th=2, 8th=1
const scale = buildScale([
  { position: 1, points: 10 }, { position: 2, points: 8 }, { position: 3, points: 6 }, { position: 4, points: 5 },
  { position: 5, points: 4 }, { position: 6, points: 3 }, { position: 7, points: 2 }, { position: 8, points: 1 },
]);

const ev = (id: string, extra: Partial<SportEvent> = {}): SportEvent => ({
  id, name: id, level: "junior", gender: "boys", measure: "time", is_team: false, points_multiplier: 1,
  status: "in_progress", scheduled_time: null, venue: null, created_by: null, created_at: "", updated_at: "", ...extra,
});
let n = 0;
const res = (event_id: string, participant_name: string, house: SportResult["house"], position: number | null, performance: string | null = null): SportResult => ({
  id: `r${++n}`, event_id, participant_name, house, position, performance, recorded_by: null, created_at: "", updated_at: "",
});

describe("points system", () => {
  it("awards 10 / 8 / 6 for 1st / 2nd / 3rd", () => {
    expect(pointsFor(1, scale)).toBe(10);
    expect(pointsFor(2, scale)).toBe(8);
    expect(pointsFor(3, scale)).toBe(6);
  });
  it("awards 0 for places beyond 8th and for no place", () => {
    expect(pointsFor(9, scale)).toBe(0);
    expect(pointsFor(null, scale)).toBe(0);
  });
  it("doubles points for an event with a ×2 multiplier (relays)", () => {
    expect(pointsFor(1, scale, 2)).toBe(20);
  });
});

describe("house standings", () => {
  it("totals points per house and ranks them", () => {
    const events = [ev("e1"), ev("e2")];
    const results = [
      res("e1", "A", "hawks", 1), res("e1", "B", "ravens", 2), res("e1", "C", "eagles", 3),
      res("e2", "D", "ravens", 1), res("e2", "E", "hawks", 2),
    ];
    const s = houseStandings(events, results, scale);
    expect(s.map((x) => [x.house, x.points, x.rank])).toEqual([
      ["hawks", 18, 1], ["ravens", 18, 1], ["eagles", 6, 3], ["falcons", 0, 4],
    ]);
  });
  it("tied athletes both earn the shared place's points", () => {
    const s = houseStandings([ev("e1")], [res("e1", "A", "hawks", 1), res("e1", "B", "falcons", 1)], scale);
    expect(s.find((x) => x.house === "hawks")!.points).toBe(10);
    expect(s.find((x) => x.house === "falcons")!.points).toBe(10);
  });
});

describe("individual awards", () => {
  it("excludes team events and picks the best athlete per house", () => {
    const events = [ev("e1"), ev("relay", { is_team: true, points_multiplier: 2 })];
    const results = [
      res("e1", "Thabo M", "eagles", 1), res("e1", "Lineo K", "eagles", 2),
      res("relay", "Eagles team", "eagles", 1),
    ];
    const athletes = athleteSummaries(events, results, scale);
    expect(athletes.map((a) => a.name)).toEqual(["Thabo M", "Lineo K"]);
    expect(bestPerHouse(athletes).eagles?.name).toBe("Thabo M");
  });
  it("merges the same athlete regardless of name casing/spaces", () => {
    const athletes = athleteSummaries([ev("e1"), ev("e2")], [res("e1", "Thabo M", "eagles", 1), res("e2", " thabo  m ", "eagles", 2)], scale);
    expect(athletes).toHaveLength(1);
    expect(athletes[0].points).toBe(18);
  });
});

describe("auto-rank", () => {
  it("parses minute:second times", () => {
    expect(parsePerformance("1:02.5", "time")).toBe(62.5);
  });
  it("ranks fastest time first, with ties sharing a place", () => {
    const rows = [{ id: "a", performance: "12.9" }, { id: "b", performance: "12.4" }, { id: "c", performance: "12.4" }, { id: "d", performance: null }];
    const r = rankByPerformance(rows, "time");
    expect([r.get("b"), r.get("c"), r.get("a"), r.get("d")]).toEqual([1, 1, 3, null]);
  });
  it("ranks longest distance first", () => {
    const r = rankByPerformance([{ id: "a", performance: "4.10" }, { id: "b", performance: "4.55" }], "distance");
    expect(r.get("b")).toBe(1);
    expect(r.get("a")).toBe(2);
  });
});
