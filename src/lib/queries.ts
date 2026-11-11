import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PointsRow, SportEvent, SportResult } from "./sports";

export const eventsQuery = queryOptions({
  queryKey: ["events"],
  queryFn: async (): Promise<SportEvent[]> => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("scheduled_time", { ascending: true, nullsFirst: false })
      .order("name");
    if (error) throw error;
    return data ?? [];
  },
});

export const resultsQuery = queryOptions({
  queryKey: ["results"],
  queryFn: async (): Promise<SportResult[]> => {
    const pageSize = 1000;
    const all: SportResult[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("results")
        .select("*")
        .order("created_at")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      all.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
    return all;
  },
});

export const pointsQuery = queryOptions({
  queryKey: ["points"],
  queryFn: async (): Promise<PointsRow[]> => {
    const { data, error } = await supabase.from("points_scale").select("*").order("position");
    if (error) throw error;
    return data ?? [];
  },
});
