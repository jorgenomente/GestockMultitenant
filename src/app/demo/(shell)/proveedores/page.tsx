import type { Metadata } from "next";
import DemoPageHeader from "../../components/DemoPageHeader";
import ProvidersDemoView from "../../views/ProvidersDemoView";

export const metadata: Metadata = {
  title: "Gestock Demo · Proveedores",
  description: "Agenda ficticia con responsables, montos y alertas listas para la demo guiada.",
};

export default function DemoProvidersPage() {
  return (
    <div className="space-y-8">
      <DemoPageHeader
        title="Gestión de proveedores"
        description="Revisá cómo se programa la semana, qué alertas seguir y qué automatizaciones se activan en el circuito demo."
        badge="Proveedores"
      />
      <ProvidersDemoView />
    </div>
  );
}

