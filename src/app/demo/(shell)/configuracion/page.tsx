import type { Metadata } from "next";
import DemoPageHeader from "../../components/DemoPageHeader";
import ConfigDemoView from "../../views/ConfigDemoView";

export const metadata: Metadata = {
  title: "Gestock Demo · Configuración",
  description: "Roles ficticios, políticas por sucursal y automatizaciones de ejemplo.",
};

export default function DemoConfigPage() {
  return (
    <div className="space-y-8">
      <DemoPageHeader
        title="Configuración del tenant demo"
        description="Mostrá cómo se gestionan accesos, políticas y automatizaciones sin tocar la instancia real. Todo lo que ves está preconfigurado para el modo demo."
        badge="Configuración"
      />
      <ConfigDemoView />
    </div>
  );
}
