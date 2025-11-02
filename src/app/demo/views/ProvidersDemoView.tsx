"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CalendarDays,
  History as HistoryIcon,
  Truck,
  UserRound,
  Banknote,
  Landmark,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  DEMO_PROVIDER_WEEKS,
  DEMO_PROVIDERS,
} from "../data/demoData";

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

const DAY_LABELS_EXT: Record<number, string> = {
  0: DAYS[0],
  1: DAYS[1],
  2: DAYS[2],
  3: DAYS[3],
  4: DAYS[4],
  5: DAYS[5],
  6: DAYS[6],
  [-1]: "Sin día asignado",
};

const FREQ_LABEL: Record<"SEMANAL" | "QUINCENAL" | "MENSUAL", string> = {
  SEMANAL: "Semanal",
  QUINCENAL: "Quincenal",
  MENSUAL: "Mensual",
};

type DemoProvider = {
  id: string;
  name: string;
  freq: "SEMANAL" | "QUINCENAL" | "MENSUAL";
  orderDay: number;
  receiveDay: number;
  responsible: string;
  status: "PENDIENTE" | "REALIZADO";
  paymentMethod: "EFECTIVO" | "TRANSFERENCIA";
  summary?: {
    total?: number;
    items?: number;
    updatedAt?: string;
  };
  lastAddedAt?: string;
};

type ProviderStatusMap = Record<string, DemoProvider["status"]>;

type ProviderSummaryMap = Record<string, DemoProvider["summary"]>;

type ViewTab = "TODOS" | "PENDIENTES" | "SEMANAL" | "QUINCENAL" | "MENSUAL";

const formatMoney = (value?: number) => {
  if (!value) return "$0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
};

const toDate = (iso?: string) => (iso ? new Date(iso) : null);

const formatDateTime = (iso?: string) => {
  const d = toDate(iso);
  if (!d) return null;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const normalizeDay = (day: number | null | undefined) => {
  if (typeof day !== "number" || Number.isNaN(day)) return -1;
  if (day < 0 || day > 6) return -1;
  return day;
};

export default function ProvidersDemoView() {
  const weekOptions = DEMO_PROVIDER_WEEKS;
  const providers = DEMO_PROVIDERS as DemoProvider[];
  const [selectedWeekId, setSelectedWeekId] = useState<string>(weekOptions[0]?.id ?? "");
  const [tab, setTab] = useState<ViewTab>("TODOS");
  const [query, setQuery] = useState("");
  const [statusMap, setStatusMap] = useState<ProviderStatusMap>(() => {
    const initial: ProviderStatusMap = {};
    providers.forEach((p) => {
      initial[p.id] = p.status;
    });
    return initial;
  });

  const summaries = useMemo<ProviderSummaryMap>(() => {
    const map: ProviderSummaryMap = {};
    providers.forEach((p) => {
      map[p.id] = p.summary;
    });
    return map;
  }, [providers]);

  const totalProviders = providers.length;

  const filteredProviders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((provider) => {
      const status = statusMap[provider.id] ?? provider.status;
      if (tab === "PENDIENTES" && status !== "PENDIENTE") return false;
      if (tab === "SEMANAL" && provider.freq !== "SEMANAL") return false;
      if (tab === "QUINCENAL" && provider.freq !== "QUINCENAL") return false;
      if (tab === "MENSUAL" && provider.freq !== "MENSUAL") return false;

      if (!q) return true;
      const haystack = `${provider.name} ${provider.responsible}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [providers, statusMap, tab, query]);

  const groupedProviders = useMemo(() => {
    const groups = new Map<number, DemoProvider[]>();
    [0, 1, 2, 3, 4, 5, 6, -1].forEach((key) => groups.set(key, []));
    filteredProviders.forEach((provider) => {
      const normalized = normalizeDay(provider.orderDay);
      const bucket = groups.get(normalized);
      if (bucket) bucket.push(provider);
    });
    groups.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [filteredProviders]);

  const todayIdx = normalizeDay(new Date().getDay());
  const hasResults = filteredProviders.length > 0;

  const handleToggleStatus = (providerId: string) => {
    setStatusMap((prev) => ({
      ...prev,
      [providerId]: prev[providerId] === "REALIZADO" ? "PENDIENTE" : "REALIZADO",
    }));
  };

  const selectedWeek = weekOptions.find((w) => w.id === selectedWeekId) ?? weekOptions[0];

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 pb-24 pt-6 sm:max-w-2xl">
      <div className="sticky top-0 z-20 space-y-3 rounded-2xl border border-border/60 bg-card/95 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Proveedores</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HistoryIcon className="h-3.5 w-3.5" />
              <span>{selectedWeek?.label ?? "Semana demo"}</span>
            </div>
          </div>
          <Select value={selectedWeekId} onValueChange={setSelectedWeekId}>
            <SelectTrigger className="h-9 w-[200px] rounded-xl text-xs">
              <SelectValue placeholder="Elegir semana" />
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map((week) => (
                <SelectItem key={week.id} value={week.id}>
                  {week.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="muted" className="px-3">
            Total: {totalProviders}
          </Badge>
          <Badge variant="outline" className="px-3 text-xs uppercase tracking-wide">
            Vista demo
          </Badge>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as ViewTab)} className="space-y-3">
        <TabsList className="grid h-10 w-full grid-cols-5 rounded-2xl bg-muted/40 p-1">
          <TabsTrigger className="h-9 rounded-xl px-2 text-xs" value="TODOS">
            Todos
          </TabsTrigger>
          <TabsTrigger className="h-9 rounded-xl px-2 text-xs" value="PENDIENTES">
            Pendientes
          </TabsTrigger>
          <TabsTrigger className="h-9 rounded-xl px-2 text-xs" value="SEMANAL">
            Semanal
          </TabsTrigger>
          <TabsTrigger className="h-9 rounded-xl px-2 text-xs" value="QUINCENAL">
            Quincenal
          </TabsTrigger>
          <TabsTrigger className="h-9 rounded-xl px-2 text-xs" value="MENSUAL">
            Mensual
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Input
        placeholder="Buscar proveedor o responsable"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-10 rounded-xl bg-inputBackground/90 text-sm shadow-[var(--shadow-card)]"
        aria-label="Buscar proveedor"
      />

      {hasResults ? (
        <Accordion type="multiple" defaultValue={[`day-${todayIdx}`]} className="w-full">
          {[0, 1, 2, 3, 4, 5, 6, -1].map((idx) => {
            const list = groupedProviders.get(idx) ?? [];
            if (!list.length) return null;

            return (
              <AccordionItem
                key={`day-${idx}`}
                value={`day-${idx}`}
                className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-[var(--shadow-card)] first:mt-0"
              >
                <AccordionTrigger className="px-4 py-3">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-left text-sm font-semibold text-foreground">
                      {DAY_LABELS_EXT[idx]}
                    </span>
                    <Badge variant="muted" className="ml-2 px-3 text-xs">
                      {list.length} {list.length === 1 ? "proveedor" : "proveedores"}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 bg-card px-4 pb-4">
                  {list.map((provider) => {
                    const status = statusMap[provider.id] ?? provider.status;
                    const summary = summaries[provider.id];
                    const paymentIsCash = provider.paymentMethod === "EFECTIVO";
                    const updatedAt = formatDateTime(summary?.updatedAt);
                    const receiveDayIdx = normalizeDay(provider.receiveDay);
                    const receiveDayLabel = receiveDayIdx === -1 ? "—" : DAYS[receiveDayIdx];

                    return (
                      <Card key={provider.id} className="transition-transform hover:-translate-y-0.5">
                        <CardContent className="p-4 space-y-3">
                        {(summary?.total || summary?.items || updatedAt) ? (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-foreground/80">
                            {summary?.total ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-[2px]">
                                💰 {formatMoney(summary.total)}
                              </span>
                            ) : null}
                            {summary?.items ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-[2px]">
                                📦 {summary.items} art.
                              </span>
                            ) : null}
                            {updatedAt ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-[2px]">
                                🕒 {updatedAt}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="flex items-center gap-2">
                          <p className="flex-1 truncate text-sm font-semibold leading-none text-foreground">
                            {provider.name}
                          </p>
                          <Badge
                            variant={status === "REALIZADO" ? "secondary" : "destructive"}
                            className="h-6 px-3 text-[10px]"
                          >
                            {status === "REALIZADO" ? "Realizado" : "Pendiente"}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" aria-hidden />
                            {FREQ_LABEL[provider.freq]}
                          </span>
                          <span aria-hidden>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Truck className="h-3 w-3" aria-hidden />
                            Recibe: {receiveDayLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-[2px] text-foreground/80">
                            {paymentIsCash ? <Banknote className="h-3 w-3" aria-hidden /> : <Landmark className="h-3 w-3" aria-hidden />}
                            {paymentIsCash ? "Efectivo" : "Transferencia"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-[2px] text-foreground/80">
                            <UserRound className="h-3 w-3" aria-hidden />
                            {provider.responsible}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg"
                            asChild
                          >
                            <Link href={`/demo/proveedores/${provider.id}/pedido`}>
                              Ver pedido demo
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant={status === "PENDIENTE" ? "destructive" : "default"}
                            className="h-8 rounded-lg"
                            onClick={() => handleToggleStatus(provider.id)}
                          >
                            {status === "PENDIENTE" ? (
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Marcar realizado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <XCircle className="h-3.5 w-3.5" />
                                Volver a pendiente
                              </span>
                            )}
                          </Button>
                        </div>

                        {provider.lastAddedAt ? (
                          <p className="text-[11px] text-muted-foreground">
                            Última vez agregado: {formatDateTime(provider.lastAddedAt)}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <Card className="rounded-2xl border border-border/60 bg-card/95 p-6 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
          No hay proveedores que coincidan con los filtros en esta vista demo.
        </Card>
      )}
    </main>
  );
}
