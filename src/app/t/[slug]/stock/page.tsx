import StockPageClient from "./StockPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function StockPage() {
  return <StockPageClient />;
}

