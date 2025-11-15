import { Package, ShoppingCart, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricsCardsProps {
  totalProducts: number;
  totalUnits: number;
  totalValue: number;
  variationPercent: number;
}

export function MetricsCards({
  totalProducts,
  totalUnits,
  totalValue,
  variationPercent,
}: MetricsCardsProps) {
  const isPositive = variationPercent >= 0;

  const metrics = [
    {
      label: 'Productos',
      value: totalProducts,
      icon: Package,
      color: 'text-[#6366F1]',
      bg: 'bg-[#EEF2FF]',
    },
    {
      label: 'Unidades',
      value: totalUnits,
      icon: ShoppingCart,
      color: 'text-[#8B5CF6]',
      bg: 'bg-[#F5F3FF]',
    },
    {
      label: 'Valor total',
      value: `$${totalValue.toLocaleString('es-ES')}`,
      icon: DollarSign,
      color: 'text-[#27AE60]',
      bg: 'bg-[#E0F2F1]',
    },
    {
      label: 'Variación',
      value: `${isPositive ? '+' : ''}${variationPercent.toFixed(1)}%`,
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-[#27AE60]' : 'text-[#EF4444]',
      bg: isPositive ? 'bg-[#E0F2F1]' : 'bg-[#FEE2E2]',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-xl p-4 border border-[#EAEAEA] shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`${metric.bg} ${metric.color} p-2 rounded-lg`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-[#6B7280] mb-1">{metric.label}</p>
            <p className={`text-[#0E2E2B] ${typeof metric.value === 'string' && metric.value.includes('$') ? 'text-base' : ''}`}>
              {metric.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
