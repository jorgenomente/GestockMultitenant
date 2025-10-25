import { useMutation, useQueryClient } from "@tanstack/react-query";

type RoleOption = "owner" | "admin" | "staff";
type UpsertPayload = {
  userId: string;
  role: RoleOption;
  branchIds?: string[] | null;
};

type UpsertResponse = {
  tenant_id: string;
  user_id: string;
  role: RoleOption;
  branch_ids: string[] | null;
};

function parseUpsertResponse(text: string): { data: UpsertResponse | null; errorMessage?: string } {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      const message = typeof (parsed as { error?: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : undefined;
      return { data: null, errorMessage: message };
    }
    return { data: parsed as UpsertResponse };
  } catch {
    return { data: null };
  }
}

export function useUpsertMember(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertPayload) => {
      const res = await fetch(`/api/t/${slug}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      const { data, errorMessage } = parseUpsertResponse(txt);
      if (!res.ok) throw new Error(errorMessage ?? `HTTP ${res.status}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", slug] }),
  });
}
