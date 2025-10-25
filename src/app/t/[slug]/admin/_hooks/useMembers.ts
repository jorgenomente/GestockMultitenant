import { useQuery } from "@tanstack/react-query";

export type MemberRow = {
  user_id: string;
  email: string | null;
  role: "owner" | "admin" | "staff";
  branch_ids: string[] | null;
  branch_names: string[] | null;
}; 

function parseMembersResponse(text: string): { data: MemberRow[] | null; errorMessage?: string } {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      const message = typeof (parsed as { error?: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : undefined;
      return { data: null, errorMessage: message };
    }
    if (Array.isArray(parsed)) {
      return { data: parsed as MemberRow[] };
    }
    return { data: [] };
  } catch {
    return { data: null };
  }
}

export function useMembers(slug: string) {
  return useQuery({
    queryKey: ["members", slug],
    queryFn: async () => {
      const res = await fetch(`/api/t/${slug}/memberships`, { cache: "no-store" });
      const txt = await res.text();
      const { data, errorMessage } = parseMembersResponse(txt);
      if (!res.ok) throw new Error(errorMessage ?? `HTTP ${res.status}`);
      return data ?? [];
    },
  });
}
