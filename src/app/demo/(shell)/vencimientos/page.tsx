import type { Metadata } from "next";
import DemoPageHeader from "../../components/DemoPageHeader";
import ExpiriesDemoView from "../../views/ExpiriesDemoView";

export const metadata: Metadata = {
  title: "Gestock Demo · Vencimientos",
  description: "Lotes ficticios priorizados y storytelling para evitar mermas en la demo.",
};

export default function DemoExpiriesPage() {
  return (
    <div className="space-y-8">
      <DemoPageHeader
        title="Control de vencimientos"
        description="Mostrá cómo la demo ordena lotes según criticidad y ofrece un guion para explicar la analítica detrás de cada recomendación."
        badge="Vencimientos"
      />
      <ExpiriesDemoView />
    </div>
  );
}
