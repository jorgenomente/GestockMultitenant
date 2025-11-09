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
        description="Ten control sobre los usuarios de la aplicacion."
        badge="Configuración"
      />
      <ConfigDemoView />
    </div>
  );
}
