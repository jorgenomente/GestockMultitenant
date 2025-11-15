import { useState } from 'react';
import { ChevronDown, ChevronRight, Package, TrendingUp, TrendingDown, Minus as MinusIcon } from 'lucide-react';
import { Product, ProductGroup } from '../App';
import { Badge } from './ui/badge';
import { CompactProductCard } from './CompactProductCard';

interface EnhancedProductGroupProps {
  group: ProductGroup;
  onProductUpdate: (groupId: string, productId: string, field: keyof Product, value: any) => void;
  onRemoveProduct: (groupId: string, productId: string) => void;
  onViewStats?: (product: Product) => void;
}

export function EnhancedProductGroup({
  group,
  onProductUpdate,
  onRemoveProduct,
  onViewStats,
}: EnhancedProductGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate group stats
  const subtotal = group.products.reduce((sum, p) => sum + (p.price * p.orderQuantity), 0);
  const totalUnits = group.products.reduce((sum, p) => sum + p.orderQuantity, 0);
  const avgPrice = group.products.length > 0 
    ? group.products.reduce((sum, p) => sum + p.price, 0) / group.products.length 
    : 0;
  
  const stockVariation = group.products.reduce((sum, p) => {
    const variation = p.finalStock - p.currentStock;
    return sum + variation;
  }, 0);

  const variationPercent = group.products.reduce((sum, p) => {
    if (p.currentStock === 0) return sum;
    return sum + ((p.finalStock - p.currentStock) / p.currentStock);
  }, 0) / group.products.length * 100;

  const isPositiveVariation = stockVariation >= 0;

  return (
    <div className="bg-white rounded-xl border border-[#EAEAEA] shadow-sm overflow-hidden">
      {/* Group Header */}
      <div
        className="p-5 cursor-pointer hover:bg-[#F9FAF9] transition-colors border-b border-[#EAEAEA]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-[#27AE60]">
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
            <Package className="w-5 h-5 text-[#6B7280]" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-[#0E2E2B]">{group.name}</h3>
                <Badge variant="outline" className="border-[#EAEAEA] text-[#6B7280] text-xs">
                  {group.products.length} productos
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
                <span>{totalUnits} unidades</span>
                <span>•</span>
                <span>Promedio: ${avgPrice.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Stock: 
                  {isPositiveVariation ? (
                    <span className="text-[#27AE60] flex items-center">
                      <TrendingUp className="w-3 h-3 ml-1" />
                      {stockVariation > 0 ? `+${stockVariation}` : stockVariation}
                    </span>
                  ) : stockVariation < 0 ? (
                    <span className="text-[#EF4444] flex items-center">
                      <TrendingDown className="w-3 h-3 ml-1" />
                      {stockVariation}
                    </span>
                  ) : (
                    <span className="text-[#6B7280] flex items-center">
                      <MinusIcon className="w-3 h-3 ml-1" />
                      0
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#6B7280] mb-1">Subtotal</p>
            <p className="text-[#0E2E2B]">${subtotal.toLocaleString('es-ES')}</p>
          </div>
        </div>
      </div>

      {/* Products List */}
      {isExpanded && (
        <div className="p-4 bg-[#F9FAF9] space-y-3">
          {group.products.map((product) => (
            <CompactProductCard
              key={product.id}
              product={product}
              groupId={group.id}
              onUpdate={onProductUpdate}
              onRemove={onRemoveProduct}
              onViewStats={onViewStats}
            />
          ))}
        </div>
      )}
    </div>
  );
}
