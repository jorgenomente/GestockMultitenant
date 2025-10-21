// src/app/t/[slug]/b/[branch]/page.tsx
import Link from "next/link";
import { getSupabaseServer } from "@/lib/authz";
import { paths } from "@/lib/paths";

type MembershipRow = { role: string | null };

export default async function BranchDashboard({
  params,
}: {
  params: Promise<{ slug: string; branch: string }>;
}) {
  const { slug, branch: branchSlug } = await params;
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) Tenant por slug (simple)
  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", slug)
    .single();
  if (tErr || !tenant) {
    return (
      <main className="p-6">
        <h1 className="text-lg font-semibold">Tenant no encontrado</h1>
      </main>
    );
  }

  // 2) Branch por slug + tenant_id (sin subquery)
  const { data: branch, error: bErr } = await supabase
    .from("branches")
    .select("id, name, slug, tenant_id")
    .eq("tenant_id", tenant.id)
    .eq("slug", branchSlug)
    .single();
  if (bErr || !branch) {
    return (
      <main className="p-6">
        <h1 className="text-lg font-semibold">Sucursal no encontrada</h1>
      </main>
    );
  }

  // 3) KPIs (cuentas) — RLS filtra igualmente
  const [{ count: prodCount }, { count: orderCount }] = await Promise.all([
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
  ]);

  let role: string | null = null;

  if (user) {
    const { data: membershipRow, error: membershipErr } = await supabase
      .from("memberships")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .maybeSingle<MembershipRow>();

    if (membershipErr) {
      console.error("branch dashboard membership lookup failed", membershipErr);
    }

    role = membershipRow?.role ?? null;
  }

  return (
    <main className="max-w-screen-md mx-auto p-4 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{branch.name}</h1>
          <p className="text-xs text-neutral-500">
            {tenant.slug} · {branch.slug}
          </p>
        </div>
        {role === "owner" && (
          <Link href={paths.admin(tenant.slug)} className="text-sm underline">
            Admin del tenant
          </Link>
        )}
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <CardKpi label="Productos" value={prodCount ?? 0} href={paths.stock(tenant.slug, branch.slug)} />
        <CardKpi label="Estadísticas" value={orderCount ?? 0} href={paths.stats(tenant.slug, branch.slug)} />
        <CardKpi label="Price Search" value="ir" href={paths.priceSearch(tenant.slug, branch.slug)} />
      </section>

      <section className="rounded-2xl border p-4 space-y-2">
        <h2 className="font-medium">Accesos rápidos</h2>
        <nav className="flex flex-wrap gap-2">
          <QuickLink href={paths.stock(tenant.slug, branch.slug)}>Stock</QuickLink>
          <QuickLink href={paths.stats(tenant.slug, branch.slug)}>Estadísticas</QuickLink>
          <QuickLink href={paths.invoices(tenant.slug, branch.slug)}>Facturas</QuickLink>
          <QuickLink href={paths.payments(tenant.slug, branch.slug)}>Pagos</QuickLink>
          <QuickLink href={paths.tasks(tenant.slug, branch.slug)}>Tareas</QuickLink>
          <QuickLink href={paths.expirations(tenant.slug, branch.slug)}>Vencimientos</QuickLink>
          <QuickLink href={paths.settings(tenant.slug, branch.slug)}>Configuración</QuickLink>
        </nav>
        <p className="text-xs text-neutral-500">RLS activo: cada usuario ve sólo su sucursal.</p>
      </section>
    </main>
  );
}

function CardKpi({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href?: string;
}) {
  const className =
    "block rounded-xl border p-4 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-black/30";

  const content = (
    <>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function QuickLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border px-3 py-1 text-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-black/30"
    >
      {children}
    </Link>
  );
}
