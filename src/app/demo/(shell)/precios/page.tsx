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
        description="Explorá cómo la demo calcula sugerencias inteligentes, resalta alertas y muestra el impacto antes de publicar cambios."
        badge="Precios"
      />
      <PricesDemoView />
    </div>
  );
}
