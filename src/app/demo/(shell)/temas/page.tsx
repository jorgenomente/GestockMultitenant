import type { Metadata } from "next";
import DemoPageHeader from "../../components/DemoPageHeader";
import ThemesDemoView from "../../views/ThemesDemoView";

export const metadata: Metadata = {
  title: "Gestock Demo · Temas",
  description: "Paletas ficticias y previsualización de componentes sin afectar la app real.",
};

export default function DemoThemesPage() {
  return (
    <div className="space-y-8">
      <DemoPageHeader
        title="Personalización visual"
        description="Configurá temas demo para mostrar las opciones de branding, manteniendo la instancia de producción intacta."
        badge="Temas"
      />
      <ThemesDemoView />
    </div>
  );
}
