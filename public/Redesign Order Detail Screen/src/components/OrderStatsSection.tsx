import { 
  PlusCircle, 
  Package, 
  PackageOpen, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart,
  Minus as MinusIcon
} from 'lucide-react';

interface OrderStatsSectionProps {
  newProducts: number;
  initialStock: number;
  finalStock: number;
  totalVariation: number;
  avgUnitPrice: number;
  avgTicket: number;
}

export function OrderStatsSection({
  newProducts,
  initialStock,
  finalStock,
  totalVariation,
  avgUnitPrice,
  avgTicket,
}: OrderStatsSectionProps) {
  const getVariationColor = (value: number) => {
    if (value > 0) return 'text-[#27AE60]';
    if (value < 0) return 'text-[#EF4444]';
    return 'text-[#6B7280]';
  };

  const getVariationBg = (value: number) => {
    if (value > 0) return 'bg-[#E0F2F1]';
    if (value < 0) return 'bg-[#FEE2E2]';
    return 'bg-[#F3F4F6]';
  };

  const getVariationIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4" />;
    if (value < 0) return <TrendingDown className="w-4 h-4" />;
    return <MinusIcon className="w-4 h-4" />;
  };

  const stats = [
    {
      title: 'Productos nuevos',
      value: newProducts,
      icon: PlusCircle,
      color: 'text-[#6366F1]',
      bg: 'bg-[#EEF2FF]',
      type: 'neutral',
    },
    {
      title: 'Stock inicial',
      value: initialStock,
      icon: Package,
      color: 'text-[#8B5CF6]',
      bg: 'bg-[#F5F3FF]',
      type: 'neutral',
    },
    {
      title: 'Stock final',
      value: finalStock,
      icon: PackageOpen,
      color: 'text-[#EC4899]',
      bg: 'bg-[#FCE7F3]',
      type: 'neutral',
    },
    {
      title: 'Variación total',
      value: `${totalVariation >= 0 ? '+' : ''}${totalVariation.toFixed(1)}%`,
      icon: totalVariation >= 0 ? TrendingUp : totalVariation < 0 ? TrendingDown : MinusIcon,
      color: getVariationColor(totalVariation),
      bg: getVariationBg(totalVariation),
      type: 'variation',
      variationValue: totalVariation,
    },
    {
      title: 'Precio unitario promedio',
      value: `$${avgUnitPrice.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-[#F59E0B]',
      bg: 'bg-[#FEF3C7]',
      type: 'neutral',
    },
    {
      title: 'Ticket promedio',
      value: `$${avgTicket.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`,
      icon: ShoppingCart,
      color: 'text-[#10B981]',
      bg: 'bg-[#D1FAE5]',
      type: 'neutral',
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-[#0E2E2B]">Estadísticas del pedido</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-[#F9FAF9] rounded-xl p-4 border border-[#E9ECEB] hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`${stat.bg} ${stat.color} p-2.5 rounded-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
                {stat.type === 'variation' && stat.variationValue !== undefined && (
                  <div className={`flex items-center gap-1 ${getVariationColor(stat.variationValue)}`}>
                    {getVariationIcon(stat.variationValue)}
                  </div>
                )}
              </div>
              <p className="text-xs text-[#7C868B] mb-2">{stat.title}</p>
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
