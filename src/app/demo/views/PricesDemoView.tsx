"use client";

import React from "react";
import { Camera, RefreshCcw, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DEMO_PRICE_ITEMS } from "../data/demoData";

type SearchItem = (typeof DEMO_PRICE_ITEMS)[number];

const LIMIT = 10;
const INPUT_ID = "demo-price-search-input";

const fmtMoney = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const normText = (value: unknown) =>
  !value
    ? ""
    : String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const tokens = q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!tokens.length) return <>{text}</>;
  const re = new RegExp(`(${tokens.join("|")})`, "ig");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, index) =>
        re.test(part) ? (
          <mark key={`${part}-${index}`} className="rounded bg-accent/40 px-1 text-foreground">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </>
  );
}

export default function PricesDemoView() {
  const [query, setQuery] = React.useState("");
  const [scannerOpen, setScannerOpen] = React.useState(false);

  const tokens = React.useMemo(
    () =>
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 4),
    [query]
  );

  const filtered = React.useMemo(() => {
    if (!tokens.length) return [];
    const hits: SearchItem[] = [];
    for (const item of DEMO_PRICE_ITEMS) {
      const haystack = [item.name, item.code, item.barcode].map(normText).join(" ");
      const ok = tokens.every((token) => haystack.includes(normText(token)));
      if (ok) {
        hits.push(item);
        if (hits.length >= LIMIT) break;
      }
    }
    return hits;
  }, [tokens]);

  const searching = query.trim().length > 0;
  const hasResults = filtered.length > 0;

  const handleScannerSimulate = React.useCallback(() => {
    setScannerOpen(true);
  }, []);

  const handleCloseScanner = React.useCallback(() => {
    setScannerOpen(false);
  }, []);

  const handlePasteDemo = React.useCallback(() => {
    setQuery("7790000123456");
    setScannerOpen(false);
  }, []);

  const lastUpdatedLabel = "03/05/2024 09:00";

  return (
    <>
      <div className="w-full bg-background">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:space-y-8 md:py-8">
          <section className="rounded-3xl border border-border/50 bg-background/95 p-5 shadow-[0_25px_60px_-35px_rgba(0,0,0,0.45)] md:bg-muted/20 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Buscador de precios</h1>
                <p className="text-xs text-muted-foreground">
                  Actualizado: {lastUpdatedLabel} · Fuente: Demo interna
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground">
                  Ítems cargados: <span className="font-semibold text-foreground">{DEMO_PRICE_ITEMS.length.toLocaleString("es-AR")}</span>
                </span>
                <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground uppercase tracking-wide">
                  Resultados máx.: {LIMIT}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl px-3 text-xs font-medium"
                    title="Solo demostración"
                    aria-disabled
                    disabled
                  >
                    <Upload className="mr-2 h-4 w-4" /> Importar precios
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 w-10 rounded-xl p-0"
                    title="Solo demostración"
                    aria-disabled
                    disabled
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="sticky top-2 z-50 rounded-3xl border border-border/50 bg-background/95 p-5 shadow-[0_25px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:top-4 md:bg-muted/20 md:p-7">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar producto, categoría o código…"
                  className="h-12 rounded-2xl border border-border/50 bg-background/70 pl-11 pr-4 text-base shadow-sm"
                  inputMode="search"
                  id={INPUT_ID}
                />
              </div>
              <Button
                variant="outline"
                className="h-12 w-12 shrink-0 rounded-2xl p-0"
                title="Escanear código de barras"
                onClick={handleScannerSimulate}
                aria-label="Escanear código de barras"
              >
                <Camera className="h-5 w-5" />
              </Button>
            </div>

            {!searching ? (
              <div className="mt-3 text-xs text-muted-foreground">
                Esta demo incluye un subconjunto de 6 productos. Escribí o escaneá para ver cómo respondería la app real (máx. {LIMIT} coincidencias).
              </div>
            ) : !hasResults ? (
              <div className="mt-3 rounded-2xl border border-border/60 bg-background px-4 py-2 text-xs text-muted-foreground">
                No encontramos resultados para el término {query}.
              </div>
            ) : null}
          </section>

          <section className="-mx-4 min-h-[80vh] space-y-4 pt-3 md:mx-0 md:space-y-5 md:pt-5">
            {hasResults
              ? filtered.map((item) => (
                  <Card
                    key={item.id}
                    className="w-full rounded-none border border-border/40 bg-card/80 shadow-[0_20px_45px_-35px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5 md:mx-0 md:rounded-3xl"
                  >
                    <CardContent className="flex flex-col gap-3 px-4 py-4 md:gap-5 md:px-6 md:py-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-accent/15 px-3 py-1 text-accent-foreground">Producto</span>
                          {item.code ? (
                            <span className="rounded-full bg-background px-3 py-1 font-medium text-foreground shadow-sm">#{item.code}</span>
                          ) : null}
                          {item.barcode ? (
                            <span className="rounded-full bg-background px-3 py-1 font-mono text-[11px] text-foreground/80 shadow-sm">
                              {item.barcode}
                            </span>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground">
                          Actualizado · {item.updatedAtLabel}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg font-semibold leading-snug text-foreground md:text-xl">
                            <Highlight text={item.name} q={query} />
                          </h2>
                        </div>
                        <div className="flex flex-col items-end text-right">
                          <div className="text-2xl font-bold tracking-tight text-destructive md:text-3xl">
                            {fmtMoney(item.price)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">Precio venta</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              : searching && !hasResults
              ? null
              : (
                  <div className="mx-4 rounded-2xl border border-border/40 bg-muted/15 px-4 py-6 text-sm text-muted-foreground md:mx-0">
                    Empezá a tipear para ver cómo aparecen los resultados. Probá con <span className="font-semibold">&quot;Yerba&quot;</span> o pegá un código de barras de ejemplo.
                  </div>
                )}
          </section>
        </div>
      </div>

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border/60 bg-card/95 p-6 shadow-[0_25px_60px_-35px_rgba(0,0,0,0.45)]">
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-semibold">Escáner de códigos (demo)</h2>
            <p className="text-sm text-muted-foreground">
              En la versión real se abre la cámara para leer códigos. Acá podés simularlo pegando uno de
              ejemplo.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={handlePasteDemo} variant="secondary">
                Usar código ficticio
              </Button>
              <Button size="sm" variant="outline" onClick={handleCloseScanner}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
