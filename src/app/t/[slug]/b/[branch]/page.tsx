import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import type { ComponentType, SVGProps } from "react";
import {
  CalendarClock,
  Truck,
  Wallet,
  Users,
  Boxes,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { getSupabaseServer } from "@/lib/authz";
import { paths } from "@/lib/paths";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BranchMessagesBoard, type BranchMessage } from "@/components/branch/BranchMessagesBoard";

type Role = "owner" | "admin" | "staff";

type MembershipRow = {
  role: string | null;
  branch_ids: string[] | null;
};

type ExpirationRow = {
  id: string;
  name: string;
  exp_date: string | null;
  qty: number | null;
};

type ProviderRow = {
  id: string;
  name: string;
  responsible: string | null;
  payment_method: string | null;
  status: string | null;
  receive_day: number | null;
};

type TenantRow = { id: string; slug: string; name: string | null };
type BranchRow = { id: string; name: string; slug: string; tenant_id: string };

type Params = { slug: string; branch: string };

type UpcomingExpiration = {
  id: string;
  name: string;
  quantity: number | null;
  daysLeft: number;
  whenLabel: string;
  displayDate: string;
  severity: "expired" | "urgent" | "soon" | "ok";
};

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseExpDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const ddMMyy = /^(\d{2})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ddMMyy) {
    const dd = Number.parseInt(ddMMyy[1], 10);
    const mm = Number.parseInt(ddMMyy[2], 10) - 1;
    const yy = 2000 + Number.parseInt(ddMMyy[3], 10);
    const candidate = new Date(yy, mm, dd);
    if (
      candidate.getFullYear() === yy &&
      candidate.getMonth() === mm &&
      candidate.getDate() === dd
    ) {
      return candidate;
    }
  }

  return null;
}

function describeDaysLeft(daysLeft: number): string {
  if (daysLeft < 0) return `Venció hace ${Math.abs(daysLeft)} d`;
  if (daysLeft === 0) return "Vence hoy";
  if (daysLeft === 1) return "Vence mañana";
  return `Faltan ${daysLeft} d`;
}

function severityFor(daysLeft: number): "expired" | "urgent" | "soon" | "ok" {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 1) return "urgent";
  if (daysLeft <= 3) return "soon";
  return "ok";
}

function severityClasses(sev: UpcomingExpiration["severity"]): string {
  switch (sev) {
    case "expired":
      return "border-red-200 bg-red-50 text-red-900";
    case "urgent":
      return "border-orange-200 bg-orange-50 text-orange-900";
    case "soon":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
}

function paymentLabel(method: string | null | undefined) {
  if (!method) return "Sin dato";
  return method === "EFECTIVO" ? "Efectivo" : "Transferencia";
}

function providerStatusLabel(status: string | null | undefined) {
  if (!status) return "Pendiente";
  return status === "REALIZADO" ? "Realizado" : "Pendiente";
}

export default async function BranchDashboard({ params }: { params: Promise<Params> }) {
  const { slug, branch: branchSlug } = await params;
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(paths.branch(slug, branchSlug))}`);
  }

  const [{ data: tenant, error: tenantError }] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle<TenantRow>(),
  ]);

  if (tenantError) {
    console.error("branch dashboard tenant lookup failed", tenantError);
  }
  if (!tenant) {
    return (
      <main className="p-6">
        <h1 className="text-lg font-semibold">Tenant no encontrado</h1>
      </main>
    );
  }

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id, name, slug, tenant_id")
    .eq("tenant_id", tenant.id)
    .eq("slug", branchSlug)
    .maybeSingle<BranchRow>();

  if (branchError) {
    console.error("branch dashboard branch lookup failed", branchError);
  }
  if (!branch) {
    return (
      <main className="p-6">
        <h1 className="text-lg font-semibold">Sucursal no encontrada</h1>
      </main>
    );
  }

  const { data: membershipRow, error: membershipError } = await supabase
    .from("memberships")
    .select("role, branch_ids")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle<MembershipRow>();

  if (membershipError) {
    console.error("branch dashboard membership lookup failed", membershipError);
  }

  const role = (membershipRow?.role ?? "staff") as Role;

  const today = new Date();
  const todayIdx = today.getDay();
  const todayName = DAY_NAMES[todayIdx] ?? "Hoy";

  const [productsCountRes, ordersCountRes, expirationsRes, providersRes, messagesRes] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("branch_id", branch.id),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("branch_id", branch.id),
    supabase
      .from("expirations")
      .select("id, name, exp_date, qty")
      .eq("tenant_id", tenant.id)
      .eq("branch_id", branch.id)
      .order("exp_date", { ascending: true })
      .limit(100),
    supabase
      .from("providers")
      .select("id, name, responsible, payment_method, status, receive_day")
      .eq("tenant_id", tenant.id)
      .eq("branch_id", branch.id)
      .eq("receive_day", todayIdx)
      .order("name", { ascending: true }),
    supabase
      .from("branch_messages")
      .select("id, message, author_id, author_name, created_at")
      .eq("tenant_id", tenant.id)
      .eq("branch_id", branch.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (productsCountRes.error) {
    console.error("branch dashboard products count", productsCountRes.error);
  }
  if (ordersCountRes.error) {
    console.error("branch dashboard orders count", ordersCountRes.error);
  }
  if (expirationsRes.error) {
    console.error("branch dashboard expirations", expirationsRes.error);
  }
  if (providersRes.error) {
    console.error("branch dashboard providers", providersRes.error);
  }
  if (messagesRes.error) {
    console.error("branch dashboard messages", messagesRes.error);
  }

  const upcomingExpirations: UpcomingExpiration[] = (expirationsRes.data ?? [])
    .map((row: ExpirationRow) => {
      const parsed = parseExpDate(row.exp_date);
      if (!parsed) return null;
      const diff = Math.floor(
        (startOfDay(parsed).getTime() - startOfDay(today).getTime()) / (1000 * 60 * 60 * 24)
      );
      const severity = severityFor(diff);
      return {
        id: row.id,
        name: row.name,
        quantity: row.qty,
        daysLeft: diff,
        whenLabel: describeDaysLeft(diff),
        displayDate: parsed.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
        severity,
      } satisfies UpcomingExpiration;
    })
    .filter((item): item is UpcomingExpiration => item !== null)
    .filter((item) => item.daysLeft >= 0 && item.daysLeft <= 3)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6);

  const providersToday = (providersRes.data ?? []) as ProviderRow[];

  const initialMessages: BranchMessage[] = (messagesRes.data ?? []).map((row) => ({
    id: row.id,
    message: row.message,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: row.created_at,
  }));

  const baseBranchPath = paths.branch(tenant.slug, branch.slug);

  const actionLinks = [
    {
      label: "Pedidos",
      description: "Gestioná los proveedores y sus pedidos",
      href: `${baseBranchPath}/proveedores`,
      icon: Truck,
    },
    {
      label: "Pagos",
      description: "Registrá pagos y comprobantes",
      href: `${baseBranchPath}/payments`,
      icon: Wallet,
    },
    {
      label: "Vencimientos",
      description: "Controlá productos por vencer",
      href: `${baseBranchPath}/vencimientos`,
      icon: CalendarClock,
    },
    {
      label: "Stock",
      description: "Actualizá existencias y ajustes",
      href: `${baseBranchPath}/stock`,
      icon: Boxes,
    },
    {
      label: "Clientes",
      description: "Seguimiento de pedidos de clientes",
      href: `${baseBranchPath}/clients`,
      icon: Users,
    },
    {
      label: "Estadísticas",
      description: "Revisá métricas clave",
      href: `${baseBranchPath}/stats`,
      icon: BarChart3,
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-28 pt-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{branch.name}</h1>
          <p className="text-sm text-muted-foreground">
            {tenant.name ?? tenant.slug} · {branch.slug}
          </p>
        </div>
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
            <CalendarClock className="h-4 w-4" /> {todayName}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
            <ClipboardList className="h-4 w-4" /> Rol: {role}
          </span>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Productos registrados"
          value={productsCountRes.count ?? 0}
          href={`${baseBranchPath}/stock`}
        />
        <KpiCard
          label="Pedidos cargados"
          value={ordersCountRes.count ?? 0}
          href={`${baseBranchPath}/proveedores`}
        />
        <KpiCard
          label="Mensajes activos"
          value={initialMessages.length}
          href="#mensajes"
        />
        <KpiCard
          label="Proveedores hoy"
          value={providersToday.length}
          href={`${baseBranchPath}/proveedores`}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {actionLinks.map((action) => (
          <ActionLink key={action.label} {...action} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_minmax(0,1fr)]">
        <div id="mensajes">
          <BranchMessagesBoard
            tenantSlug={tenant.slug}
            branchSlug={branch.slug}
            currentUserId={user.id}
            role={role}
            initialMessages={initialMessages}
          />
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Vencimientos próximos (3 días)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingExpirations.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay productos por vencer en los próximos días.
                </p>
              )}
              {upcomingExpirations.map((item) => (
                <div
                  key={item.id}
                  className={clsx(
                    "rounded-xl border px-3 py-2 text-sm shadow-sm",
                    severityClasses(item.severity)
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {item.whenLabel}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span>Cant.: {item.quantity ?? "—"}</span>
                    <span>Fecha: {item.displayDate}</span>
                  </div>
                </div>
              ))}
              {upcomingExpirations.length > 0 && (
                <Link
                  href={`${baseBranchPath}/vencimientos`}
                  className="text-sm font-medium text-primary underline"
                >
                  Ver detalle de vencimientos
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Proveedores que reciben hoy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {providersToday.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay proveedores programados para hoy.
                </p>
              )}
              {providersToday.map((provider) => (
                <div
                  key={provider.id}
                  className="rounded-xl border border-border/80 bg-background px-3 py-2 text-sm shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{provider.name}</span>
                    <Badge variant={provider.status === "REALIZADO" ? "secondary" : "outline"}>
                      {providerStatusLabel(provider.status)}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Responsable: {provider.responsible ?? "General"}</span>
                    <span>Pago: {paymentLabel(provider.payment_method)}</span>
                  </div>
                </div>
              ))}
              {providersToday.length > 0 && (
                <Link
                  href={`${baseBranchPath}/proveedores`}
                  className="text-sm font-medium text-primary underline"
                >
                  Ver agenda de proveedores
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function KpiCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-border"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-sm">
      {content}
    </div>
  );
}

function ActionLink({
  label,
  description,
  href,
  icon: Icon,
}: {
  label: string;
  description: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-border"
    >
      <div className="flex items-center gap-3 text-foreground">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-base font-semibold leading-tight">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <span className="flex items-center gap-2 text-sm font-medium text-primary">
        Entrar
        <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
          →
        </span>
      </span>
    </Link>
  );
}
