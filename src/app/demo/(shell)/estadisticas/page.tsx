import type { Metadata } from "next";
import OrdersPageClient from "@/components/orders/OrdersPageClient";

export const metadata: Metadata = {
  title: "Gestock Demo · Estadísticas",
  description:
    "Seguimiento de indicadores y compras a proveedores con la misma experiencia que la app real.",
};

export default function DemoStatisticsPage() {
  return <OrdersPageClient variant="demo" />;
}
