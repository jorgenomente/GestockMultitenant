import type { Metadata } from "next";
import ProviderOrderDemoView from "../../../../views/ProviderOrderDemoView";
import { DEMO_PROVIDER_ORDERS, DEMO_PROVIDERS } from "../../../../data/demoData";

type PageParams = {
  params: {
    provId: string;
  };
};

export function generateMetadata({ params }: PageParams): Metadata {
  const { provId } = params;
  const existing = DEMO_PROVIDER_ORDERS[provId];
  const provider = existing
    ? existing.providerName
    : DEMO_PROVIDERS.find((p) => p.id === provId)?.name;

  const title = provider
    ? `Gestock Demo · Pedido ${provider}`
    : "Gestock Demo · Pedido demo";

  return {
    title,
    description:
      "Pedido ficticio con checklist y estadísticas simuladas para presentar Gestock sin conectar datos reales.",
  };
}

export default function DemoProviderOrderPage({ params }: PageParams) {
  return <ProviderOrderDemoView providerId={params.provId} />;
}

