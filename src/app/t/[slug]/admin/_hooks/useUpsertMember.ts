import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpsertMember(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      role: "owner" | "admin" | "staff";
      branchIds?: string[];
    }) => {
      const res = await fetch(`/api/t/${slug}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      let json: any = null;
      try { json = JSON.parse(txt); } catch {/* noop */}
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", slug] }),
  });
}
