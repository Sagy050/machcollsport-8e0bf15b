import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { eventsQuery, pointsQuery, resultsQuery } from "@/lib/queries";
import { buildScale } from "@/lib/scoring";

export function useSportsData() {
  const events = useQuery(eventsQuery);
  const results = useQuery(resultsQuery);
  const points = useQuery(pointsQuery);
  const scale = useMemo(() => buildScale(points.data ?? []), [points.data]);
  return {
    events: events.data ?? [],
    results: results.data ?? [],
    pointsRows: points.data ?? [],
    scale,
    isLoading: events.isLoading || results.isLoading || points.isLoading,
    error: events.error || results.error || points.error,
  };
}
