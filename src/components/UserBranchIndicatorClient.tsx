"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

type Props = { email?: string };

export default function UserBranchIndicatorClient({ email }: Props) {
  const pathname = usePathname();

  const branchSlug = useMemo(() => {
    if (!pathname) return "";
    const match = pathname.match(/^\/t\/[^/]+\/b\/([^/]+)/);
    if (!match || match.length < 2) return "";
    try {
      return decodeURIComponent(match[1]);
    } catch (error) {
      return match[1];
    }
  }, [pathname]);

  const displayEmail = email?.trim() ?? "";
  const displayBranch = branchSlug.trim();

  return (
    <div className="w-full border-b border-neutral-200 bg-neutral-50/80 px-4 py-2 text-xs text-neutral-600 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-300">
      <div className="mx-auto flex max-w-screen-lg flex-wrap items-center justify-end gap-x-4 gap-y-1">
        <span>
          <strong className="font-medium text-neutral-700 dark:text-neutral-200">Usuario:</strong>{" "}
          {displayEmail || "—"}
        </span>
        <span>
          <strong className="font-medium text-neutral-700 dark:text-neutral-200">Sucursal:</strong>{" "}
          {displayBranch || "—"}
        </span>
      </div>
    </div>
  );
}
