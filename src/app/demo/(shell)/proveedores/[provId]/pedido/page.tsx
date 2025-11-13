import type { Metadata } from "next";
import ProviderOrderDemoView from "../../../../views/ProviderOrderDemoView";
import { DEMO_PROVIDER_ORDERS, DEMO_PROVIDERS } from "../../../../data/demoData";

type ProviderPageProps = {
  params: Promise<{ provId: string }>;
};

export async function generateMetadata({ params }: ProviderPageProps): Promise<Metadata> {
  const { provId } = await params;
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

export default async function DemoProviderOrderPage({ params }: ProviderPageProps) {
  const { provId } = await params;
  return <ProviderOrderDemoView providerId={provId} />;
}
