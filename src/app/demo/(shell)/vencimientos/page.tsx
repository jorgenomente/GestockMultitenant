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
        description="Ten los vencimientos bajo control. Aquí se guardan los vencimientos y se generan alertas para tomar acción con los productos próximos a vencer."
        badge="Vencimientos"
      />
      <ExpiriesDemoView />
    </div>
  );
}
