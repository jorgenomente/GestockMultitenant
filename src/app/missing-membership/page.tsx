// src/app/missing-membership/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MissingMembershipPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Falta asignarte un tenant</h1>
        <p className="text-sm text-muted-foreground">
          La sesión está activa pero no encontramos un <code>membership</code> asociado al tenant principal.
        </p>
      </header>

      <section className="space-y-3 text-sm leading-relaxed">
        <p>
          Revisá en el panel de administración si tu usuario está asignado al tenant correcto. Si necesitás recrear la relación, podés usar la sección de usuarios del tenant o volver a ejecutar el flujo de bootstrap.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <Link className="text-primary underline" href="/admin">
              Abrir administrador
            </Link>
          </li>
          <li>
            Visitá la página <code>/t/&lt;tu-slug&gt;/whoami</code> para validar el rol y las sucursales visibles.
          </li>
        </ul>
      </section>
    </main>
  );
}
