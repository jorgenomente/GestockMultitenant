// src/components/UserBranchIndicator.tsx
import UserBranchIndicatorClient from "./UserBranchIndicatorClient";
import { getSupabaseServer } from "@/lib/authz";

export default async function UserBranchIndicator() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return <UserBranchIndicatorClient />;
    }

    const email = data?.user?.email ?? "";
    return <UserBranchIndicatorClient email={email} />;
  } catch (error) {
    return <UserBranchIndicatorClient />;
  }
}
