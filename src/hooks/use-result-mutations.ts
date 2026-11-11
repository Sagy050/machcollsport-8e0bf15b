import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SportResult } from "@/lib/sports";

type ResultInsert = Database["public"]["Tables"]["results"]["Insert"];
type ResultUpdate = Database["public"]["Tables"]["results"]["Update"];

export function useResultMutations() {
  const qc = useQueryClient();
  const key = ["results"];

  const add = useMutation({
    mutationFn: async (row: ResultInsert) => {
      const { data, error } = await supabase.from("results").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      qc.setQueryData<SportResult[]>(key, (old) => (old?.some((r) => r.id === row.id) ? old : [...(old ?? []), row]));
    },
    onError: (e: Error) => toast.error(`Couldn't save: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ResultUpdate }) => {
      const { data, error } = await supabase.from("results").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<SportResult[]>(key);
      qc.setQueryData<SportResult[]>(key, (old) => old?.map((r) => (r.id === id ? { ...r, ...patch } as SportResult : r)));
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error(`Couldn't update: ${e.message}`);
    },
    onSuccess: (row) => {
      qc.setQueryData<SportResult[]>(key, (old) => old?.map((r) => (r.id === row.id ? row : r)));
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("results").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<SportResult[]>(key);
      qc.setQueryData<SportResult[]>(key, (old) => old?.filter((r) => r.id !== id));
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error(`Couldn't delete: ${e.message}`);
    },
  });

  return { add, update, remove };
}
