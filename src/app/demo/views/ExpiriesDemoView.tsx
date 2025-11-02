"use client";

import React from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  Check,
  ChevronDown,
  Clock4,
  Flame,
  History as HistoryIcon,
  Search,
  Snowflake,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  DEMO_EXPIRY_ITEMS,
  DEMO_EXPIRY_ARCHIVES,
  type DemoExpiryItem,
  type DemoArchivedItem,
} from "../data/demoExpiries";

const REFERENCE_DATE = new Date("2024-05-02T12:00:00-03:00");

type Draft = Partial<Pick<DemoExpiryItem, "name" | "expDate" | "qty" | "freezer" >>;

type GroupKey = "gf" | "gx" | "g1" | "g2" | "g3";

type Severity = "expired" | "soon" | "near" | "later" | "invalid";

type GroupMeta = {
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  empty: string;
  bubbleTone: string;
  badgeTone: string;
};

const GROUP_META: Record<GroupKey, GroupMeta> = {
  gf: {
    label: "Freezer",
    description: "Productos marcados para frío",
    icon: Snowflake,
    empty: "No hay productos marcados como Freezer.",
    bubbleTone:
      "border border-border/40 bg-[color:var(--surface-action-primary-strong)] text-[var(--color-action-secondary)]",
    badgeTone:
      "bg-[color:var(--surface-action-primary-strong)] text-[var(--color-action-secondary)]",
  },
  gx: {
    label: "Vencidos",
    description: "Atención inmediata",
    icon: AlertTriangle,
    empty: "Sin productos en este rango.",
    bubbleTone:
      "border border-border/40 bg-[color:var(--surface-alert-soft)] text-[var(--destructive)]",
    badgeTone:
      "bg-[color:var(--surface-alert-soft)] text-[var(--destructive)]",
  },
  g1: {
    label: "Vence en 1 a 3 días",
    description: "Prioridad alta",
    icon: Flame,
    empty: "Sin productos en este rango.",
    bubbleTone:
      "border border-border/40 bg-[color:var(--surface-honey-soft)] text-[var(--color-honey-light)]",
    badgeTone:
      "bg-[color:var(--surface-honey-soft)] text-[var(--color-honey-light)]",
  },
  g2: {
    label: "Faltan 4 a 10 días",
    description: "Planificá seguimiento",
    icon: Clock4,
    empty: "Sin productos en este rango.",
    bubbleTone:
      "border border-border/40 bg-[color:var(--surface-action-primary-soft)] text-[var(--color-action-secondary)]",
    badgeTone:
      "bg-[color:var(--surface-action-primary-soft)] text-[var(--color-action-secondary)]",
  },
  g3: {
    label: "Más adelante (11+ días)",
    description: "Control de largo plazo",
    icon: CalendarClock,
    empty: "Sin productos en este rango.",
    bubbleTone:
      "border border-border/40 bg-[color:var(--surface-data-secondary-soft)] text-[var(--color-data-primary)]",
    badgeTone:
      "bg-[color:var(--surface-data-secondary-soft)] text-[var(--color-data-primary)]",
  },
};

const SUMMARY_CARDS = [
  {
    key: "freezer" as const,
    label: "Freezer",
    description: "Productos en frío",
    icon: Snowflake,
  },
  {
    key: "expired" as const,
    label: "Vencidos",
    description: "Revisá urgente",
    icon: AlertTriangle,
  },
  {
    key: "next" as const,
    label: "Próximos (1-10 días)",
    description: "Seguimiento cercano",
    icon: Clock4,
  },
  {
    key: "later" as const,
    label: "Más adelante (11+ días)",
    description: "Control a futuro",
    icon: CalendarClock,
  },
];

function parseDdMmAa(value: string): Date | null {
  const match = /^(\d{2})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, ddStr, mmStr, yyStr] = match;
  const dd = Number.parseInt(ddStr, 10);
  const mm = Number.parseInt(mmStr, 10);
  const yy = 2000 + Number.parseInt(yyStr, 10);
  const date = new Date(yy, mm - 1, dd);
  if (date.getFullYear() !== yy || date.getMonth() !== mm - 1 || date.getDate() !== dd) {
    return null;
  }
  return date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysUntil(expDate: string): number | null {
  const parsed = parseDdMmAa(expDate);
  if (!parsed) return null;
  const diff = startOfDay(parsed).getTime() - startOfDay(REFERENCE_DATE).getTime();
  return Math.round(diff / 86400000);
}

function severityOf(expDate: string): Severity {
  const diff = daysUntil(expDate);
  if (diff === null) return "invalid";
  if (diff < 0) return "expired";
  if (diff <= 3) return "soon";
  if (diff <= 10) return "near";
  return "later";
}

function severityLabel(expDate: string): string {
  const diff = daysUntil(expDate);
  if (diff === null) return "Fecha inválida";
  if (diff < 0) return `Vencido hace ${Math.abs(diff)} d`;
  if (diff === 0) return "Vence hoy";
  if (diff === 1) return "Vence mañana";
  return `Faltan ${diff} d`;
}

function severityAccentColor(sev: Severity): string {
  switch (sev) {
    case "expired":
      return "var(--destructive)";
    case "soon":
      return "var(--color-action-secondary)";
    case "near":
      return "var(--color-action-secondary)";
    case "later":
      return "var(--color-data-primary)";
    default:
      return "var(--border)";
  }
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function createDemoItem(partial: Partial<DemoExpiryItem>): DemoExpiryItem {
  return {
    id: `demo-${Math.random().toString(36).slice(2, 8)}`,
    name: "Producto demo",
    expDate: "10-05-24",
    qty: 1,
    freezer: false,
    confirmed: false,
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

export default function ExpiriesDemoView() {
  const [items, setItems] = React.useState<DemoExpiryItem[]>(() => DEMO_EXPIRY_ITEMS);
  const [archives, setArchives] = React.useState<DemoArchivedItem[]>(() => DEMO_EXPIRY_ARCHIVES);
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  const [openSections, setOpenSections] = React.useState<Record<GroupKey, boolean>>({
    gf: true,
    gx: true,
    g1: true,
    g2: false,
    g3: false,
  });
  const [searchQuery, setSearchQuery] = React.useState("");
  const [registerDialogOpen, setRegisterDialogOpen] = React.useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = React.useState(false);

  const [newItem, setNewItem] = React.useState<DemoExpiryItem>(() =>
    createDemoItem({ name: "Budín proteico vainilla", expDate: "05-05-24", qty: 6 })
  );

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = normalizeText(searchQuery);
    return items.filter((item) =>
      normalizeText(item.name).includes(q) || normalizeText(item.expDate).includes(q)
    );
  }, [items, searchQuery]);

  const freezerItems = React.useMemo(
    () => filteredItems.filter((item) => (drafts[item.id]?.freezer ?? item.freezer) === true),
    [filteredItems, drafts]
  );

  const grouped = React.useMemo(() => {
    const base = {
      gx: [] as DemoExpiryItem[],
      g1: [] as DemoExpiryItem[],
      g2: [] as DemoExpiryItem[],
      g3: [] as DemoExpiryItem[],
    };

    for (const item of filteredItems) {
      const sev = severityOf(drafts[item.id]?.expDate ?? item.expDate);
      if (sev === "expired") base.gx.push(item);
      else if (sev === "soon") base.g1.push(item);
      else if (sev === "near") base.g2.push(item);
      else base.g3.push(item);
    }
    return base;
  }, [filteredItems, drafts]);

  const summary = React.useMemo(() => {
    const expired = grouped.gx.length;
    const soon = grouped.g1.length + grouped.g2.length;
    const later = grouped.g3.length;
    const freezerCount = freezerItems.length;

    return SUMMARY_CARDS.map((card) => {
      const Icon = card.icon;
      const value =
        card.key === "freezer"
          ? freezerCount
          : card.key === "expired"
          ? expired
          : card.key === "next"
          ? soon
          : later;

      return {
        ...card,
        Icon,
        value,
      };
    });
  }, [freezerItems.length, grouped.g1.length, grouped.g2.length, grouped.g3.length, grouped.gx.length]);

  const sections: Array<{ key: GroupKey; items: DemoExpiryItem[] }> = [
    { key: "gf", items: freezerItems },
    { key: "gx", items: grouped.gx },
    { key: "g1", items: grouped.g1 },
    { key: "g2", items: grouped.g2 },
    { key: "g3", items: grouped.g3 },
  ];

  const updateDraft = React.useCallback((id: string, patch: Draft) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
  }, []);

  const clearDraft = React.useCallback((id: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const applyChanges = React.useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const draft = drafts[id] ?? {};
          return {
            ...item,
            name: draft.name ?? item.name,
            expDate: draft.expDate ?? item.expDate,
            qty: draft.qty ?? item.qty,
            freezer: draft.freezer ?? item.freezer,
            confirmed: true,
            updatedAt: new Date().toISOString(),
          };
        })
      );
      clearDraft(id);
    },
    [clearDraft, drafts]
  );

  const deleteItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    clearDraft(id);
  }, [clearDraft]);

  const archiveItem = React.useCallback(
    (id: string) => {
      const base = items.find((item) => item.id === id);
      if (!base) return;
      const draft = drafts[id] ?? {};

      const archived: DemoArchivedItem = {
        id: `arch-${Math.random().toString(36).slice(2, 8)}`,
        name: draft.name ?? base.name,
        expDate: draft.expDate ?? base.expDate,
        qty: draft.qty ?? base.qty,
        freezer: draft.freezer ?? base.freezer,
        archivedAt: new Date().toISOString(),
      };

      setItems((prev) => prev.filter((item) => item.id !== id));
      setArchives((prev) => [archived, ...prev]);
      clearDraft(id);
    },
    [clearDraft, drafts, items]
  );

  const handleToggleFreezer = React.useCallback(
    (id: string) => {
      const current = drafts[id]?.freezer ?? items.find((item) => item.id === id)?.freezer ?? false;
      updateDraft(id, { freezer: !current });
    },
    [drafts, items, updateDraft]
  );

  const handleQtyChange = React.useCallback(
    (id: string, value: string) => {
      const onlyDigits = value.replace(/[^\d]/g, "");
      if (!onlyDigits) {
        updateDraft(id, { qty: 0 });
        return;
      }
      updateDraft(id, { qty: Number.parseInt(onlyDigits, 10) });
    },
    [updateDraft]
  );

  const toggleSection = (key: GroupKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const registerNewItem = () => {
    const itemToAdd: DemoExpiryItem = {
      ...newItem,
      id: `demo-${Math.random().toString(36).slice(2, 8)}`,
      updatedAt: new Date().toISOString(),
      confirmed: false,
    };
    setItems((prev) => [itemToAdd, ...prev]);
    setNewItem(createDemoItem({ name: "Budín proteico vainilla", expDate: "05-05-24", qty: 6 }));
    setRegisterDialogOpen(false);
  };

  const removeArchive = (id: string) => {
    setArchives((prev) => prev.filter((archive) => archive.id !== id));
  };

  const renderItemCard = (item: DemoExpiryItem) => {
    const draft = drafts[item.id] ?? {};
    const display = {
      name: draft.name ?? item.name,
      expDate: draft.expDate ?? item.expDate,
      qty: draft.qty ?? item.qty,
      freezer: draft.freezer ?? item.freezer ?? false,
    };

    const expInputId = `exp-${item.id}`;
    const qtyInputId = `qty-${item.id}`;

    const severity = severityOf(display.expDate);
    const severityColor = severityAccentColor(severity);
    const severityText = severityLabel(display.expDate);
    const isExpired = severity === "expired";
    const hasDraft = Boolean(drafts[item.id]);

    return (
      <Card
        key={item.id}
        className={clsx(
          "overflow-hidden rounded-3xl border border-border/40 bg-[color:var(--surface-nav-strong)]",
          "shadow-[0_24px_48px_-28px_rgba(0,0,0,0.8)] transition-transform duration-200 hover:-translate-y-0.5"
        )}
        style={{ borderLeft: `6px solid ${severityColor}` }}
      >
        <CardContent className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-card-foreground sm:text-xl">{display.name}</h3>
              <p className="text-xs text-muted-foreground">
                Actualizado: {new Date(item.updatedAt).toLocaleString("es-AR")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: severityColor,
                  color: "var(--background)",
                  boxShadow: "0 10px 20px -15px rgba(0,0,0,0.75)",
                }}
              >
                {severityText}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className={clsx(
                  "h-9 w-9 rounded-xl border transition-colors",
                  display.freezer
                    ? "border-[var(--color-action-secondary)] bg-[var(--color-action-secondary)] text-[var(--background)]"
                    : "border-border/40 bg-[color:var(--surface-muted)] text-[var(--color-action-secondary)]"
                )}
                title={display.freezer ? "Marcado como Freezer" : "Marcar como Freezer"}
                onClick={() => handleToggleFreezer(item.id)}
              >
                <Snowflake className="h-4 w-4" />
              </Button>
              {isExpired && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-xl border border-border/40 bg-[color:var(--surface-alert-subtle)] text-[var(--destructive)] hover:bg-[color:var(--surface-alert-strong)]"
                  title="Archivar (solo vencidos)"
                  onClick={() => archiveItem(item.id)}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-xl border border-[var(--color-action-secondary)] bg-[var(--color-action-secondary)] text-[var(--background)] hover:bg-[var(--color-action-secondary)]/90"
                title={hasDraft || !item.confirmed ? "Aplicar cambios" : "Cambios aplicados"}
                onClick={() => applyChanges(item.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="h-9 w-9 rounded-xl"
                title="Eliminar"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-12 items-end gap-3">
            <div className="col-span-12 sm:col-span-5">
              <label
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor={expInputId}
              >
                Vencimiento (dd-mm-aa)
              </label>
              <Input
                id={expInputId}
                value={display.expDate}
                onChange={(event) => updateDraft(item.id, { expDate: event.target.value })}
                className="h-11 rounded-xl border border-border/40 bg-[color:var(--surface-background-soft)]"
                inputMode="numeric"
              />
            </div>
            <div className="col-span-6 sm:col-span-3">
              <label
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor={qtyInputId}
              >
                Cant.
              </label>
              <Input
                id={qtyInputId}
                value={display.qty}
                onChange={(event) => handleQtyChange(item.id, event.target.value)}
                className="h-11 rounded-xl border border-border/40 bg-[color:var(--surface-background-soft)]"
                inputMode="numeric"
              />
            </div>
            <div className="col-span-6 sm:col-span-4 sm:text-right">
              <p className="text-xs text-muted-foreground">
                {hasDraft || !item.confirmed ? "Pendiente de aplicar" : "Cambios aplicados"}
                {display.freezer ? " · Freezer" : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,var(--surface-action-primary-soft),transparent_60%)] pb-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-card-foreground sm:text-4xl">
            Vencimientos
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Registro y control de productos próximos a vencer. Todos los datos que ves son ficticios.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map(({ key, label, description, Icon, value }) => (
            <Card
              key={key}
              className="border border-border/40 bg-[color:var(--surface-background-soft)] shadow-[0_20px_50px_-35px_rgba(0,0,0,0.7)]"
            >
              <CardContent className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/40 bg-[color:var(--surface-overlay-muted)] text-[var(--color-action-secondary)]">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="text-2xl font-semibold text-card-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-[var(--color-action-secondary)] px-6 py-2 text-sm font-semibold text-[var(--background)] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.85)] hover:bg-[var(--color-action-secondary)]/90">
                Registrar nuevo vencimiento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-3xl border border-border/40 bg-[color:var(--surface-nav-strong)] p-6 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)]">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground">Alta rápida (demo)</h2>
                  <p className="text-xs text-muted-foreground">
                    En la app real este formulario se sincroniza con tu catálogo. Aquí sólo genera un registro ficticio.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="demo-exp-name"
                      className="text-sm font-semibold text-card-foreground"
                    >
                      Producto
                    </label>
                    <Input
                      id="demo-exp-name"
                      value={newItem.name}
                      onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
                      className="h-11 rounded-xl border border-border/40 bg-[color:var(--surface-background-soft)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="demo-exp-date"
                      className="text-sm font-semibold text-card-foreground"
                    >
                      Vencimiento (dd-mm-aa)
                    </label>
                    <Input
                      id="demo-exp-date"
                      value={newItem.expDate}
                      onChange={(event) => setNewItem((prev) => ({ ...prev, expDate: event.target.value }))}
                      className="h-11 rounded-xl border border-border/40 bg-[color:var(--surface-background-soft)]"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="demo-exp-qty"
                      className="text-sm font-semibold text-card-foreground"
                    >
                      Cantidad
                    </label>
                    <Input
                      id="demo-exp-qty"
                      value={newItem.qty}
                      onChange={(event) =>
                        setNewItem((prev) => ({
                          ...prev,
                          qty: Number.parseInt(event.target.value.replace(/[^\d]/g, ""), 10) || 0,
                        }))
                      }
                      className="h-11 rounded-xl border border-border/40 bg-[color:var(--surface-background-soft)]"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-card-foreground">Freezer</span>
                    <Button
                      type="button"
                      variant={newItem.freezer ? "default" : "outline"}
                      className="h-11 rounded-xl"
                      aria-pressed={newItem.freezer}
                      onClick={() =>
                        setNewItem((prev) => ({ ...prev, freezer: !prev.freezer }))
                      }
                    >
                      {newItem.freezer ? "Marcado" : "No"}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" className="rounded-full px-4">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button
                    className="rounded-full bg-[var(--color-action-secondary)] px-6 text-[var(--background)]"
                    onClick={registerNewItem}
                  >
                    Guardar en demo
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 rounded-full border border-border/50 bg-[color:var(--surface-overlay-soft)] px-4 py-2 text-sm"
              >
                <HistoryIcon className="h-4 w-4" /> Historial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl rounded-3xl border border-border/40 bg-[color:var(--surface-nav-strong)] p-6 shadow-[0_28px_68px_-38px_rgba(0,0,0,0.85)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-card-foreground">Historial de archivados (demo)</h2>
                    <p className="text-xs text-muted-foreground">
                      Estos datos no persisten fuera de la sesión demo.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => alert("En la app real exportarías un Excel. Aquí es sólo demostrativo.")}
                    >
                      Exportar Excel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => alert("En la app real exportarías un JSON. Aquí es sólo demostrativo.")}
                    >
                      Exportar JSON
                    </Button>
                  </div>
                </div>
                <Separator className="bg-border/40" />
                <div className="max-h-[50vh] overflow-auto pr-2">
                  {archives.length === 0 ? (
                    <p className="rounded-xl bg-[color:var(--surface-overlay-soft)] px-4 py-3 text-sm text-muted-foreground">
                      Todavía no archivaste productos en esta demo.
                    </p>
                  ) : (
                    archives.map((archive) => (
                      <div
                        key={archive.id}
                        className="grid grid-cols-12 items-center gap-2 rounded-xl px-3 py-2 text-xs text-card-foreground transition hover:bg-[color:var(--surface-overlay-soft)]"
                      >
                        <div className="col-span-5 truncate" title={archive.name}>
                          {archive.name}
                        </div>
                        <div className="col-span-2 text-right">{archive.qty}</div>
                        <div className="col-span-2 text-right">{archive.expDate}</div>
                        <div className="col-span-2 text-right">{archive.freezer ? "Freezer" : ""}</div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-7 w-7 rounded-lg"
                            title="Eliminar del historial"
                            onClick={() => removeArchive(archive.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="relative ml-auto flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar producto o fecha…"
              className="h-11 rounded-full border border-border/40 bg-[color:var(--surface-background-soft)] pl-11"
            />
          </div>
        </div>

        <div className="space-y-4">
          {sections.map(({ key, items: sectionItems }) => {
            const meta = GROUP_META[key];
            const Icon = meta.icon;
            const isOpen = openSections[key];

            return (
              <div
                key={key}
                className="overflow-hidden rounded-3xl border border-border/40 bg-[color:var(--surface-background-soft)] shadow-[0_20px_55px_-28px_rgba(0,0,0,0.78)]"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-[color:var(--surface-overlay-hover)]"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <span className={clsx("flex h-10 w-10 items-center justify-center rounded-xl", meta.bubbleTone)}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-card-foreground">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={clsx("inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold", meta.badgeTone)}>
                      {sectionItems.length}
                    </span>
                    <ChevronDown
                      className={clsx("h-4 w-4 transition-transform", { "rotate-180": isOpen })}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-4 border-t border-border/40 bg-[color:var(--surface-nav-hover)] px-4 py-4 sm:px-6 sm:py-6">
                    {sectionItems.length === 0 ? (
                      <p className="rounded-2xl bg-[color:var(--surface-overlay-soft)] px-4 py-4 text-sm text-muted-foreground">
                        {meta.empty}
                      </p>
                    ) : (
                      sectionItems.map((item) => renderItemCard(item))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
