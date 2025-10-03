import { useQuery } from "@tanstack/react-query";

export type MemberRow = {
  user_id: string;
  email: string | null;
  role: "owner" | "admin" | "staff";
  branch_ids: string[] | null;
  branch_names: string[] | null;
};

export function useMembers(slug: string) {
  return useQuery({
    queryKey: ["members", slug],
    queryFn: async () => {
      const res = await fetch(`/api/t/${slug}/memberships`, { cache: "no-store" });
      const txt = await res.text();
      let json: any = null;
      try { json = JSON.parse(txt); } catch {}
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json as MemberRow[];
    },
  });
}
