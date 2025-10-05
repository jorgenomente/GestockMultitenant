// src/app/mobile/stock/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function StockPlaceholder() {
  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:max-w-lg">
      <h1 className="text-xl font-semibold">Stock</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta sección todavía no está lista. Próximamente.
      </p>
    </main>
  );
}
