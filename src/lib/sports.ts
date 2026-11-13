import type { Database } from "@/integrations/supabase/types";

export type House = Database["public"]["Enums"]["house_name"];
export type EventLevel = Database["public"]["Enums"]["event_level"];
export type EventGender = Database["public"]["Enums"]["event_gender"];
export type MeasureType = Database["public"]["Enums"]["measure_type"];
export type EventStatus = Database["public"]["Enums"]["event_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export type SportEvent = Database["public"]["Tables"]["events"]["Row"];
export type SportResult = Database["public"]["Tables"]["results"]["Row"];
export type PointsRow = Database["public"]["Tables"]["points_scale"]["Row"];

export const HOUSES: House[] = ["ravens", "hawks", "eagles", "falcons"];

export const HOUSE_META: Record<
  House,
  { label: string; solid: string; soft: string; text: string; ring: string; border: string }
> = {
  ravens: {
    label: "Ravens",
    solid: "bg-ravens text-house-foreground",
    soft: "bg-ravens-soft",
    text: "text-ravens",
    ring: "ring-ravens",
    border: "border-ravens",
  },
  hawks: {
    label: "Hawks",
    solid: "bg-hawks text-house-foreground",
    soft: "bg-hawks-soft",
    text: "text-hawks",
    ring: "ring-hawks",
    border: "border-hawks",
  },
  eagles: {
    label: "Eagles",
    solid: "bg-eagles text-eagles-foreground",
    soft: "bg-eagles-soft",
    text: "text-eagles-foreground",
    ring: "ring-eagles",
    border: "border-eagles",
  },
  falcons: {
    label: "Falcons",
    solid: "bg-falcons text-house-foreground",
    soft: "bg-falcons-soft",
    text: "text-falcons",
    ring: "ring-falcons",
    border: "border-falcons",
  },
};

export const LEVELS: EventLevel[] = ["junior", "intermediate", "senior", "mixed"];
export const LEVEL_LABEL: Record<EventLevel, string> = {
  junior: "Junior",
  intermediate: "Intermediate",
  senior: "Senior",
  mixed: "Mixed",
};

export const GENDERS: EventGender[] = ["boys", "girls", "open"];
export const GENDER_LABEL: Record<EventGender, string> = {
  boys: "Boys",
  girls: "Girls",
  open: "Open",
};

export const MEASURES: MeasureType[] = ["time", "distance", "height", "score", "placing"];
export const MEASURE_LABEL: Record<MeasureType, string> = {
  time: "Time",
  distance: "Distance",
  height: "Height",
  score: "Score",
  placing: "Placing only",
};
export const MEASURE_HINT: Record<MeasureType, string> = {
  time: "e.g. 12.45 or 1:02.30",
  distance: "metres, e.g. 4.52",
  height: "metres, e.g. 1.45",
  score: "points, e.g. 18",
  placing: "optional note",
};

export const STATUSES: EventStatus[] = ["scheduled", "in_progress", "completed", "finalised"];
export const STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  finalised: "Finalised",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  recorder: "Recorder",
  viewer: "Viewer",
};

export function eventTitle(e: Pick<SportEvent, "name" | "level" | "gender">) {
  const parts = [LEVEL_LABEL[e.level]];
  if (e.gender !== "open") parts.push(GENDER_LABEL[e.gender]);
  return `${e.name} · ${parts.join(" ")}`;
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? "th");
}
