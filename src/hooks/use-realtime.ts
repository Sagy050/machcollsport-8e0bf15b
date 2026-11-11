import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LiveStatus = "connecting" | "live" | "offline";

/** One app-wide subscription: any change to events, results or points refreshes everyone's view. */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>("connecting");

  useEffect(() => {
    const channel = supabase
      .channel(`sportsday-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, () => {
        queryClient.invalidateQueries({ queryKey: ["results"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["events"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "points_scale" }, () => {
        queryClient.invalidateQueries({ queryKey: ["points"] });
      })
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setStatus("live");
          // Catch up on anything missed while disconnected.
          queryClient.invalidateQueries({ queryKey: ["results"] });
          queryClient.invalidateQueries({ queryKey: ["events"] });
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setStatus("offline");
        }
      });

    const onOnline = () => queryClient.invalidateQueries();
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return status;
}
