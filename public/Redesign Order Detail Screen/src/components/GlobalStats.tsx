import { Sparkles, TrendingUp, DollarSign, Package, BarChart3, ShoppingCart } from 'lucide-react';

interface GlobalStatsProps {
  newProducts: number;
  initialStock: number;
  finalStock: number;
  totalVariation: number;
  avgUnitPrice: number;
  avgTicket: number;
}

export function GlobalStats({
  newProducts,
  initialStock,
  finalStock,
  totalVariation,
  avgUnitPrice,
  avgTicket,
}: GlobalStatsProps) {
  const isPositiveVariation = totalVariation >= 0;

  const stats = [
    {
      icon: Sparkles,
      label: 'Productos nuevos',
      value: newProducts.toString(),
      color: 'text-[#8B5CF6]',
      bgColor: 'bg-[#F3E8FF]',
    },
    {
      icon: Package,
      label: 'Stock inicial',
      value: initialStock.toString(),
      color: 'text-[#6B7280]',
      bgColor: 'bg-[#F3F4F6]',
    },
    {
      icon: Package,
      label: 'Stock final',
      value: finalStock.toString(),
      color: 'text-[#0E2E2B]',
      bgColor: 'bg-[#E0F2F1]',
    },
    {
      icon: TrendingUp,
      label: 'Variación total',
      value: `${isPositiveVariation ? '+' : ''}${totalVariation.toFixed(1)}%`,
      color: isPositiveVariation ? 'text-[#27AE60]' : 'text-[#EF4444]',
      bgColor: isPositiveVariation ? 'bg-[#E0F2F1]' : 'bg-[#FEE2E2]',
    },
    {
      icon: DollarSign,
      label: 'Precio unitario promedio',
      value: `$${avgUnitPrice.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`,
      color: 'text-[#27AE60]',
      bgColor: 'bg-[#E0F2F1]',
    },
    {
      icon: ShoppingCart,
      label: 'Ticket promedio',
      value: `$${avgTicket.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`,
      color: 'text-[#27AE60]',
      bgColor: 'bg-[#E0F2F1]',
    },
  ];

  return (
    <div className="bg-white rounded-[16px] p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-[#0E2E2B]" />
        <h2 className="text-[#0E2E2B]">Estadísticas del pedido</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="flex flex-col items-center p-4 bg-[#F9FAF9] rounded-lg hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center mb-3`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-xs text-[#6B7280] text-center mb-2 h-8 flex items-center">
                {stat.label}
              </p>
              <p className={`${stat.color}`}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
