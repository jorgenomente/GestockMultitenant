import { Package, Minus, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { useState } from 'react';

interface ProductCardProps {
  id: string;
  name: string;
  unitsPerPack: number;
  weeklyAvg: number;
  salesLast2Weeks: number;
  salesLast30Days: number;
  currentStock: number;
  initialQuantity: number;
  initialPrice: number;
  lastSaleDate: string;
  previousOrder: number;
  isSigned: boolean;
  onQuantityChange?: (id: string, quantity: number) => void;
  onPriceChange?: (id: string, price: number) => void;
  onDelete?: (id: string) => void;
}

export function ProductCard({
  id,
  name,
  unitsPerPack,
  weeklyAvg,
  salesLast2Weeks,
  salesLast30Days,
  currentStock,
  initialQuantity,
  initialPrice,
  lastSaleDate,
  previousOrder,
  isSigned,
  onQuantityChange,
  onPriceChange,
  onDelete,
}: ProductCardProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [price, setPrice] = useState(initialPrice);
  const [isHighlighted, setIsHighlighted] = useState(false);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 0) return;
    setQuantity(newQuantity);
    setIsHighlighted(true);
    setTimeout(() => setIsHighlighted(false), 1000);
    onQuantityChange?.(id, newQuantity);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = parseFloat(e.target.value) || 0;
    setPrice(newPrice);
    onPriceChange?.(id, newPrice);
  };

  const subtotal = quantity * price;
  const stockLevel = currentStock < weeklyAvg ? 'low' : 'normal';

  return (
    <div 
      className="group relative bg-[#F5F5F2] border border-[#DAD7CD] rounded-xl p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-black/5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-[#47685C]/10 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-[#47685C]" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[#1F1F1F] truncate pr-2">{name}</h3>
            <Badge variant="outline" className="mt-1 text-xs border-[#47685C]/30 text-[#47685C]">
              x{unitsPerPack} unidades
            </Badge>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1 hover:bg-[#C1643B]/10 hover:text-[#C1643B]"
          onClick={() => onDelete?.(id)}
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#E6DDC5]/40 rounded-lg p-2.5">
          <p className="text-xs text-[#5A8070] mb-0.5">Prom/sem</p>
          <p className="text-[#1F1F1F]">{weeklyAvg}</p>
        </div>
        <div className="bg-[#E6DDC5]/40 rounded-lg p-2.5">
          <p className="text-xs text-[#5A8070] mb-0.5">2 semanas</p>
          <p className="text-[#1F1F1F]">{salesLast2Weeks}</p>
        </div>
        <div className="bg-[#E6DDC5]/40 rounded-lg p-2.5">
          <p className="text-xs text-[#5A8070] mb-0.5">30 días</p>
          <p className="text-[#1F1F1F]">{salesLast30Days}</p>
        </div>
      </div>

      {/* Editable Section */}
      <div className="space-y-3 mb-4 pb-4 border-b border-[#DAD7CD]">
        {/* Quantity Selector */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#5A8070]">Cantidad</span>
          <div 
            className={`flex items-center gap-2 transition-all duration-300 ${
              isHighlighted ? 'ring-2 ring-[#A9C9A4] rounded-lg px-1' : ''
            }`}
          >
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-[#DAD7CD] hover:bg-[#2C4653] hover:text-[#F5F5F2] hover:border-[#2C4653]"
              onClick={() => handleQuantityChange(quantity - 1)}
            >
              <Minus className="w-3.5 h-3.5" strokeWidth={2} />
            </Button>
            <span className="w-12 text-center text-[#1F1F1F] tabular-nums">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-[#DAD7CD] hover:bg-[#47685C] hover:text-[#F5F5F2] hover:border-[#47685C]"
              onClick={() => handleQuantityChange(quantity + 1)}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            </Button>
          </div>
        </div>

        {/* Stock Indicator */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#5A8070]">Stock actual</span>
          <span 
            className={`text-sm tabular-nums ${
              stockLevel === 'low' ? 'text-[#C1643B]' : 'text-[#47685C]'
            }`}
          >
            {currentStock} unidades
          </span>
        </div>

        {/* Price Input */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[#5A8070]">Precio unitario</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-[#5A8070]">$</span>
            <Input
              type="number"
              step="0.01"
              value={price.toFixed(2)}
              onChange={handlePriceChange}
              className="w-24 h-8 text-right bg-[#FAFAF9] border-[#DAD7CD] focus:border-[#47685C] focus:ring-[#47685C]/20"
            />
          </div>
        </div>

        {/* Subtotal */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[#47685C]">Subtotal</span>
          <span className="text-[#1F1F1F] tabular-nums">
            ${subtotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-[#5A8070]">
          <div>
            <span className="text-[#888880]">Última venta:</span>{' '}
            <span className="text-[#1F1F1F]">{lastSaleDate}</span>
          </div>
          <div>
            <span className="text-[#888880]">Pedido anterior:</span>{' '}
            <span className="text-[#1F1F1F]">{previousOrder}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isSigned ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#A9C9A4]" strokeWidth={2} />
              <span className="text-[#A9C9A4]">Firmado</span>
            </>
          ) : (
            <span className="text-[#888880]">Sin firmar</span>
          )}
        </div>
      </div>
    </div>
  );
}
