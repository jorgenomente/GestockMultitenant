import type { Metadata } from "next";
import DemoPageHeader from "../../components/DemoPageHeader";
import DashboardDemoView from "../../views/DashboardDemoView";

export const metadata: Metadata = {
  title: "Gestock Demo · Inicio",
  description: "Resumen simulado con métricas clave, actividad y alertas en tiempo real.",
};

export default function DemoDashboardPage() {
  return (
    <div className="space-y-8">
      <DemoPageHeader
        title="Panel general"
        description="Visualizá cómo la demo consolida ventas, márgenes y alertas en tiempo real para tus sucursales ficticias."
        badge="Dashboard"
      />
      <DashboardDemoView />
    </div>
  );
}
