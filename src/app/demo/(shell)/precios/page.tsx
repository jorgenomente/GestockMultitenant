import type { Metadata } from "next";
import DemoPageHeader from "../../components/DemoPageHeader";
import PricesDemoView from "../../views/PricesDemoView";

export const metadata: Metadata = {
  title: "Gestock Demo · Precios",
  description: "Listas ficticias con IA sugerida, márgenes y simulaciones sincronizadas.",
};

export default function DemoPricesPage() {
  return (
    <div className="space-y-8">
      <DemoPageHeader
        title="Listas de precios"
        description="Explora cómo funciona el buscador de precios. Escribe una palabra, código de articulo o escanea el código de barras con la cámara de tu celular para ver el precio del artículo."
        badge="Precios"
      />
      <PricesDemoView />
    </div>
  );
}