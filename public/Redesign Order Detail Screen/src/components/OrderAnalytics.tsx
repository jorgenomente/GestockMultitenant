import { Package, Boxes, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { Badge } from './ui/badge';

interface OrderAnalyticsProps {
  totalProducts: number;
  totalUnits: number;
  totalValue: number;
  variationPercent: number;
  lastUpdate: string;
}

export function OrderAnalytics({
  totalProducts,
  totalUnits,
  totalValue,
  variationPercent,
  lastUpdate,
}: OrderAnalyticsProps) {
  const isPositiveVariation = variationPercent >= 0;

  return (
    <div className="bg-white rounded-[16px] p-4 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Products */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-[#6B7280]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#6B7280] mb-0.5">Productos</p>
            <p className="text-[#0E2E2B]">{totalProducts}</p>
          </div>
        </div>

        {/* Total Units */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
            <Boxes className="w-5 h-5 text-[#6B7280]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#6B7280] mb-0.5">Unidades</p>
            <p className="text-[#0E2E2B]">{totalUnits}</p>
          </div>
        </div>

        {/* Total Value */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E0F2F1] flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-[#27AE60]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#6B7280] mb-0.5">Valor total</p>
            <p className="text-[#27AE60]">${totalValue.toLocaleString('es-ES')}</p>
          </div>
        </div>

        {/* Variation */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isPositiveVariation ? 'bg-[#E0F2F1]' : 'bg-[#FEE2E2]'
          }`}>
            <TrendingUp className={`w-5 h-5 ${
              isPositiveVariation ? 'text-[#27AE60]' : 'text-[#EF4444] rotate-180'
            }`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#6B7280] mb-0.5">Variación</p>
            <div className="flex items-center gap-1">
              <p className={isPositiveVariation ? 'text-[#27AE60]' : 'text-[#EF4444]'}>
                {isPositiveVariation ? '+' : ''}{variationPercent.toFixed(1)}%
              </p>
              {/* Micro sparkline simulation */}
              <svg width="40" height="16" viewBox="0 0 40 16" className="opacity-50">
                <polyline
                  points={isPositiveVariation 
                    ? "0,14 10,12 20,10 30,6 40,2" 
                    : "0,2 10,6 20,10 30,12 40,14"
                  }
                  fill="none"
                  stroke={isPositiveVariation ? '#27AE60' : '#EF4444'}
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Last Update */}
        <div className="flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-[#6B7280]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#6B7280] mb-0.5">Actualizado</p>
            <p className="text-xs text-[#0E2E2B] truncate">{lastUpdate}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
