"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { isoWeekIdFromMs, listWeeksAround, weekLabelFromId } from "@/lib/week-utils";

export default function WeekPicker({
  paramName = "week",
  aroundPast = 16,
  aroundFuture = 4,
}: {
  paramName?: string;
  aroundPast?: number;
  aroundFuture?: number;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const current = search.get(paramName) || isoWeekIdFromMs();

  const options = React.useMemo(
    () => listWeeksAround(current, aroundPast, aroundFuture),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, aroundPast, aroundFuture]
  );

  const setWeek = (weekId: string) => {
    const sp = new URLSearchParams(search.toString());
    sp.set(paramName, weekId);
    router.replace(`?${sp.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={current} onValueChange={setWeek}>
        <SelectTrigger className="h-11 w-[min(92vw,520px)] rounded-xl">
          <SelectValue placeholder="Elegir semana…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
