import { useState } from 'react';
import { Trash2, Minus, Plus, Tag, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Product } from '../App';
import { toast } from 'sonner@2.0.3';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface ProductCardProps {
  product: Product;
  groupId: string;
  onUpdate: (groupId: string, productId: string, field: keyof Product, value: any) => void;
  onRemove: (groupId: string, productId: string) => void;
  onViewStats?: (product: Product) => void;
}

export function ProductCard({ product, groupId, onUpdate, onRemove, onViewStats }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const subtotal = product.price * product.orderQuantity;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(0, product.orderQuantity + delta);
    onUpdate(groupId, product.id, 'orderQuantity', newQuantity);
    toast.success('Guardado ✓', { duration: 1500 });
  };

  // Extract unit from product name (e.g., "500g", "400g", "x6")
  const extractUnit = (name: string) => {
    const match = name.match(/(\d+g|\d+kg|x\d+|unidad)/i);
    return match ? match[0] : 'unidad';
  };

  const unit = extractUnit(product.name);
  const productNameWithoutUnit = product.name.replace(/\s*\d+g|\s*\d+kg|\s*x\d+/i, '').trim();

  // Determine badge status
  const stockChanged = product.orderQuantity > 0;
  const badgeText = stockChanged ? 'Actualizado' : 'Sin cambios';
  const badgeColor = stockChanged 
    ? 'bg-[#E0F2F1] text-[#27AE60] border-[#27AE60]/20' 
    : 'bg-[#F3F4F6] text-[#6B7280] border-[#EAEAEA]';

  return (
    <div
      className="group relative bg-white border border-[#EAEAEA] rounded-[16px] p-5 hover:shadow-md hover:border-[#27AE60]/30 transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Delete Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(groupId, product.id)}
        className={`absolute top-3 right-3 h-8 w-8 p-0 text-[#EF4444] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-opacity ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      {/* Top Row - Product Name & Unit Tag */}
      <div className="mb-3">
        <h4 className="text-[#0E2E2B] mb-2 pr-8">
          {productNameWithoutUnit}
        </h4>
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-[#6B7280]" />
          <span className="text-sm text-[#6B7280]">{unit}</span>
        </div>
      </div>

      {/* Middle Row - Price & Stock Info */}
      <div className="mb-4 pb-4 border-b border-[#EAEAEA] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#6B7280]">Precio</span>
          <span className="text-[#0E2E2B]">${product.price.toLocaleString('es-ES')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#6B7280]">Stock</span>
          <span className="text-sm text-[#0E2E2B]">
            Actual {product.currentStock} / Final {product.finalStock}
          </span>
        </div>
        <div className="flex justify-end">
          <Badge className={`border ${badgeColor} text-xs`}>
            {badgeText}
          </Badge>
        </div>
      </div>

      {/* Sales Statistics Row */}
      {product.sales && (
        <div className="mb-4 pb-4 border-b border-[#EAEAEA]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
              <span className="hidden sm:inline">Ventas:</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1">
                      <span className="hidden md:inline">7d: {product.sales.last7Days}</span>
                      <span className="md:hidden">7d: {product.sales.last7Days}</span>
                      <span className="mx-1 hidden sm:inline">|</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ventas últimos 7 días</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="hidden sm:inline">Sem.: {product.sales.weekAvg}</span>
              <span className="hidden md:inline">| 15d: {product.sales.last15Days}</span>
              <span className="mx-1 hidden sm:inline">|</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>30d: {product.sales.last30Days}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ventas últimos 30 días</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              {product.sales.trend === 'up' && (
                <TrendingUp className="w-3.5 h-3.5 text-[#27AE60]" />
              )}
              {product.sales.trend === 'down' && (
                <TrendingDown className="w-3.5 h-3.5 text-[#EF4444]" />
              )}
              {onViewStats && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewStats(product)}
                  className="h-6 w-6 p-0 text-[#6B7280] hover:text-[#27AE60] hover:bg-[#E0F2F1]"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Row - Quantity Selector & Subtotal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuantityChange(-1)}
            className="h-9 w-9 p-0 rounded-full border-[#EAEAEA] hover:bg-[#F3F4F6] hover:border-[#27AE60] disabled:opacity-50"
            disabled={product.orderQuantity === 0}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="w-10 text-center text-[#0E2E2B]">
            {product.orderQuantity}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuantityChange(1)}
            className="h-9 w-9 p-0 rounded-full border-[#EAEAEA] hover:bg-[#F3F4F6] hover:border-[#27AE60]"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#6B7280] mb-1">Subtotal</p>
          <p className="text-[#27AE60]">
            ${subtotal.toLocaleString('es-ES')}
          </p>
        </div>
      </div>
    </div>
  );
}