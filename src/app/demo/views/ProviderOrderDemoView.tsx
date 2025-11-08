"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DEMO_PROVIDERS,
  DEMO_PROVIDER_ORDERS,
  DEMO_PROVIDER_ORDER_FALLBACK,
  type DemoProviderOrder,
  type DemoProviderOrderItem,
} from "../data/demoData";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Info,
  PackageOpen,
  Pencil,
  XCircle,
} from "lucide-react";

const STATUS_BADGES: Record<DemoProviderOrderItem["status"], { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "destructive" },
  listo: { label: "Listo", variant: "secondary" },
  revisar: { label: "Revisar", variant: "outline" },
};

type ProviderOrderDemoViewProps = {
  providerId: string;
};

type QtyState = Record<string, number>;
type StatsState = Record<string, boolean>;
type ChecklistState = Record<string, boolean>;

function normalizeOrder(providerId: string): DemoProviderOrder {
  const order = DEMO_PROVIDER_ORDERS[providerId];
  if (order) return order;
  const provider = DEMO_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return DEMO_PROVIDER_ORDER_FALLBACK;
  return {
    ...DEMO_PROVIDER_ORDER_FALLBACK,
    providerId,
    providerName: provider.name,
  };
}

function initQtyState(order: DemoProviderOrder): QtyState {
  const map: QtyState = {};
  order.groups.forEach((group) => {
    group.items.forEach((item) => {
      map[item.id] = item.orderedQty;
    });
  });
  return map;
}

function initStatsState(order: DemoProviderOrder): StatsState {
  const map: StatsState = {};
  order.groups.forEach((group) => {
    group.items.forEach((item) => {
      map[item.id] = item.status !== "listo";
    });
  });
  return map;
}

function initChecklistState(order: DemoProviderOrder): ChecklistState {
  const map: ChecklistState = {};
  order.checklist.forEach((item) => {
    map[item.id] = Boolean(item.done);
  });
  return map;
}

function formatNumber(value?: number) {
  if (value == null) return "0";
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value);
}

function formatStats(item: DemoProviderOrderItem) {
  if (!item.stats) return null;
  const { avg4w, sum2w, sum30d, lastQty, lastDate, lastUnitCost } = item.stats;
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">Estadísticas demo</p>
      <p>Promedio 4 semanas: {formatNumber(avg4w)} uds</p>
      <p>Pedidos 2 semanas: {formatNumber(sum2w)} uds</p>
      {sum30d ? <p>Pedidos 30 días: {formatNumber(sum30d)} uds</p> : null}
      {lastQty ? <p>Última compra: {formatNumber(lastQty)} uds · {lastDate ?? "fecha demo"}</p> : null}
      {lastUnitCost ? <p>Costo referencia: {lastUnitCost}</p> : null}
    </div>
  );
}

type StepperProps = {
  value: number;
  // eslint-disable-next-line no-unused-vars
  onChange: (value: number) => void;
  unit?: string;
};

function QtyStepper({ value, onChange, unit }: StepperProps) {
  const decrease = () => onChange(Math.max(0, value - 1));
  const increase = () => onChange(value + 1);

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-2 py-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={decrease}
        aria-label="Restar"
      >
        –
      </Button>
      <div className="flex min-w-[60px] flex-col items-center">
        <span className="text-sm font-semibold text-foreground">{formatNumber(value)}</span>
        {unit ? <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{unit}</span> : null}
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={increase}
        aria-label="Sumar"
      >
        +
      </Button>
    </div>
  );
}

export default function ProviderOrderDemoView({ providerId }: ProviderOrderDemoViewProps) {
  const order = useMemo(() => normalizeOrder(providerId), [providerId]);
  const [quantities, setQuantities] = useState<QtyState>(() => initQtyState(order));
  const [statsState, setStatsState] = useState<StatsState>(() => initStatsState(order));
  const [checklist, setChecklist] = useState<ChecklistState>(() => initChecklistState(order));
  const [filter, setFilter] = useState("");

  const filteredGroups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return order.groups;
    return order.groups
      .map((group) => {
        const items = group.items.filter((item) => {
          const haystack = `${item.name} ${item.category} ${item.comment ?? ""}`.toLowerCase();
          return haystack.includes(q);
        });
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [filter, order.groups]);

  const hasResults = filteredGroups.some((group) => group.items.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        <Link href="/demo/proveedores" className="font-medium text-primary hover:underline">
          Volver a proveedores
        </Link>
      </div>

      <header className="space-y-4 rounded-3xl border border-border/60 bg-card/95 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Badge variant={order.statusVariant}>{order.statusLabel}</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {order.providerName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {order.reference} · {order.branch}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              {order.eta}
            </p>
          </div>
          <Button variant="secondary" className="gap-2 rounded-xl">
            <PackageOpen className="h-4 w-4" />
            Simular recepción demo
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {order.highlights.map((highlight) => (
            <div
              key={highlight.label}
              className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-[var(--shadow-card)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {highlight.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{highlight.value}</p>
              {highlight.context ? (
                <p className="mt-1 text-xs text-muted-foreground">{highlight.context}</p>
              ) : null}
            </div>
          ))}
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="border-border/60 bg-card/95 shadow-[var(--shadow-card)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold">Detalle del pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  placeholder="Buscar producto, categoría o nota"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="h-11 rounded-xl border-border/70 bg-inputBackground/90 text-sm shadow-[var(--shadow-card)]"
                />
                <Badge variant="muted" className="rounded-full px-3 py-1 text-xs uppercase tracking-wide">
                  Vista demo · sin edición real
                </Badge>
              </div>

              <Accordion type="multiple" defaultValue={filteredGroups.map((g) => g.id)} className="space-y-4">
                {hasResults ? (
                  filteredGroups.map((group) => (
                    <AccordionItem
                      key={group.id}
                      value={group.id}
                      className="overflow-hidden rounded-2xl border border-border/60 bg-background/90 shadow-[var(--shadow-card)]"
                    >
                      <AccordionTrigger className="flex flex-col items-start gap-2 px-5 py-4 text-left">
                        <div className="flex w-full flex-wrap items-center justify-between gap-2">
                          <span className="text-base font-semibold text-foreground">{group.name}</span>
                          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[0.65rem] uppercase">
                            {group.items.length} SKU
                          </Badge>
                        </div>
                        {group.focus ? (
                          <p className="text-xs text-muted-foreground">{group.focus}</p>
                        ) : null}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 bg-card px-5 pb-5">
                        {group.items.map((item) => {
                          const quantity = quantities[item.id] ?? item.orderedQty;
                          const badge = STATUS_BADGES[item.status];
                          const statsVisible = statsState[item.id] ?? false;
                          return (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-[var(--shadow-card)]"
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-semibold text-foreground">
                                      {item.name}
                                    </h3>
                                    <Badge variant={badge.variant} className="text-[0.65rem]">
                                      {badge.label}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{item.category}</p>
                                  <div className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                                    {item.sku ? (
                                      <span className="rounded-full bg-muted px-2 py-0.5">SKU {item.sku}</span>
                                    ) : null}
                                    {item.presentation ? (
                                      <span className="rounded-full bg-muted px-2 py-0.5">{item.presentation}</span>
                                    ) : null}
                                    {item.suggestedQty ? (
                                      <span className="rounded-full bg-muted px-2 py-0.5">
                                        Sugerido: {formatNumber(item.suggestedQty)}
                                      </span>
                                    ) : null}
                                  </div>
                                  {item.comment ? (
                                    <p className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                      <Info className="h-3.5 w-3.5" />
                                      {item.comment}
                                    </p>
                                  ) : null}
                                </div>

                                <div className="flex flex-col items-start gap-2 md:items-end">
                                  <QtyStepper
                                    value={quantity}
                                    unit={item.unit ?? "uds"}
                                    onChange={(next) => setQuantities((prev) => ({ ...prev, [item.id]: next }))}
                                  />
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="gap-1 px-0 text-primary"
                                      onClick={() => setStatsState((prev) => ({ ...prev, [item.id]: !statsVisible }))}
                                    >
                                      {statsVisible ? (
                                        <>
                                          <XCircle className="h-3.5 w-3.5" /> Ocultar stats
                                        </>
                                      ) : (
                                        <>
                                          <Pencil className="h-3.5 w-3.5" /> Ver stats demo
                                        </>
                                      )}
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" className="rounded-lg">
                                      Checklist demo
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {statsVisible ? (
                                <div className="mt-3 rounded-xl border border-dashed border-border/60 bg-background/80 p-3">
                                  {formatStats(item) ?? (
                                    <p className="text-xs text-muted-foreground">
                                      No hay estadísticas guardadas para este SKU demo.
                                    </p>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </AccordionContent>
                    </AccordionItem>
                  ))
                ) : (
                  <div className="rounded-2xl border border-border/60 bg-card/95 p-6 text-center text-sm text-muted-foreground">
                    No encontramos productos que coincidan con el filtro demo.
                  </div>
                )}
              </Accordion>
            </CardContent>
          </Card>
          {order.notes ? (
            <Card className="border-dashed border-border/60 bg-card/95">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Notas del proveedor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card className="border-border/60 bg-card/95">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Checklist demo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.checklist.map((item) => {
                const checked = checklist[item.id] ?? false;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setChecklist((prev) => ({ ...prev, [item.id]: !checked }))}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/80 px-3 py-2 text-left transition hover:border-primary/60 hover:bg-primary/5"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[0.6rem] ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-card text-muted-foreground"}`}
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <span className="text-sm text-foreground">{item.label}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
