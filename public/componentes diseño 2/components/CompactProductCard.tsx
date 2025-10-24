import { useState, useEffect } from 'react';
import { Minus, Plus, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner@2.0.3';

interface CompactProductCardProps {
  id: string;
  name: string;
  unitsPerPack: number;
  weeklyAvg: number;
  salesLast2Weeks: number;
  salesLast30Days: number;
  currentStock: number;
  quantity: number;
  price: number;
  lastSaleDate: string;
  previousOrder: number;
  isSigned?: boolean;
  group?: string;
  onQuantityChange?: (quantity: number) => void;
  onPriceChange?: (price: number) => void;
  onStockChange?: (stock: number) => void;
}

// Category color mapping
const categoryColors: Record<string, { bg: string; bgHover: string; text: string; border: string }> = {
  'Lácteos': {
    bg: '#DCE8DF',
    bgHover: '#CDD9D2',
    text: '#47685C',
    border: '#E9E3D0',
  },
  'Snacks': {
    bg: '#F2E4D2',
    bgHover: '#E8D5BE',
    text: '#8B6B3A',
    border: '#E9E3D0',
  },
  'Dulces': {
    bg: '#F2E4D2',
    bgHover: '#E8D5BE',
    text: '#8B6B3A',
    border: '#E9E3D0',
  },
  'Verduras': {
    bg: '#E3EAE0',
    bgHover: '#D4DDD1',
    text: '#5A8070',
    border: '#E9E3D0',
  },
  'Frutas': {
    bg: '#E3EAE0',
    bgHover: '#D4DDD1',
    text: '#5A8070',
    border: '#E9E3D0',
  },
  'Bebidas': {
    bg: '#E2E8E7',
    bgHover: '#D3DBD9',
    text: '#2C4653',
    border: '#E9E3D0',
  },
  'Budines': {
    bg: '#F2E4D2',
    bgHover: '#E8D5BE',
    text: '#8B6B3A',
    border: '#E9E3D0',
  },
};

// Default neutral category
const defaultCategory = {
  bg: '#EEEAE3',
  bgHover: '#E0DCD5',
  text: '#5A8070',
  border: '#E9E3D0',
};

export function CompactProductCard({
  id,
  name,
  unitsPerPack,
  weeklyAvg,
  salesLast2Weeks,
  salesLast30Days,
  currentStock,
  quantity,
  price,
  lastSaleDate,
  previousOrder,
  isSigned = false,
  group = 'Otros',
  onQuantityChange,
  onPriceChange,
  onStockChange,
}: CompactProductCardProps) {
  const [localQuantity, setLocalQuantity] = useState(quantity);
  const [localPrice, setLocalPrice] = useState(price);
  const [localStock, setLocalStock] = useState(currentStock);
  const [isExpanded, setIsExpanded] = useState(false);
  const [subtotalHighlight, setSubtotalHighlight] = useState(false);
  const [stockVerified, setStockVerified] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const subtotal = localQuantity * localPrice;

  // Get category colors
  const categoryTheme = categoryColors[group] || defaultCategory;

  // Check if stock is critical
  const isCriticalStock = localStock < 5;
  const isLowStock = localStock < 10 && localStock >= 5;

  // Calculate suggested quantity based on stock and weekly average
  const suggestedQty = Math.max(0, Math.ceil((weeklyAvg * 2 - localStock) / unitsPerPack));
  const showSuggestion = suggestedQty > 0 && localQuantity !== suggestedQty;

  // Sync with external changes
  useEffect(() => {
    setLocalQuantity(quantity);
  }, [quantity]);

  useEffect(() => {
    setLocalPrice(price);
  }, [price]);

  useEffect(() => {
    setLocalStock(currentStock);
  }, [currentStock]);

  const handleQuantityChange = (newQty: number) => {
    const validQty = Math.max(0, newQty);
    setLocalQuantity(validQty);
    onQuantityChange?.(validQty);
    triggerSubtotalHighlight();
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = parseFloat(e.target.value) || 0;
    setLocalPrice(newPrice);
    onPriceChange?.(newPrice);
    triggerSubtotalHighlight();
  };

  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStock = parseFloat(e.target.value) || 0;
    const validStock = Math.max(0, newStock);
    setLocalStock(validStock);
    onStockChange?.(validStock);
  };

  const triggerSubtotalHighlight = () => {
    setSubtotalHighlight(true);
    setTimeout(() => setSubtotalHighlight(false), 600);
  };

  return (
    <div 
      className={`rounded-xl border transition-all duration-200 ${
        isExpanded ? 'shadow-[0_3px_8px_rgba(0,0,0,0.06)]' : 'shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
      }`}
      style={{ 
        backgroundColor: isHovered && !isExpanded ? categoryTheme.bgHover : categoryTheme.bg,
        borderColor: categoryTheme.border,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Compact Collapsed View */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-3 active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Category Tag */}
            {group && (
              <div 
                className="inline-block text-[9px] uppercase tracking-wider mb-1 px-1.5 py-0.5 rounded"
                style={{ 
                  fontFamily: 'var(--font-family-mono)', 
                  fontWeight: 500,
                  color: categoryTheme.text,
                  backgroundColor: `${categoryTheme.text}15`,
                  letterSpacing: '0.05em'
                }}
              >
                {group}
              </div>
            )}
            
            {/* Product Name */}
            <h3 className="text-sm m-0 mb-1 truncate" style={{ color: '#2C3A33', fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}>
              {name}
            </h3>
            
            {/* Compact Indicators */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Stock Badge */}
              <span 
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isCriticalStock 
                    ? 'bg-[#C1643B]/20 text-[#C1643B]' 
                    : isLowStock 
                    ? 'bg-[#C1643B]/10 text-[#C1643B]/70'
                    : 'bg-[#47685C]/10 text-[#5A8070]'
                }`}
                style={{ fontFamily: 'var(--font-family-mono)' }}
              >
                Stock: {localStock}
              </span>
              
              {/* Quantity Indicator */}
              {localQuantity > 0 && (
                <>
                  <span className="text-[#B9BBB8]">•</span>
                  <span className="text-[10px] text-[#C1643B] tabular-nums" style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>
                    ×{localQuantity}
                  </span>
                </>
              )}
              
              {/* Subtotal */}
              {localQuantity > 0 && (
                <>
                  <span className="text-[#B9BBB8]">•</span>
                  <span className="text-[10px] text-[#2C4653] tabular-nums" style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>
                    ${subtotal.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Expand Icon */}
          <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#2C4653]" strokeWidth={2} />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#2C4653]" strokeWidth={2} />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div 
          className="border-t px-3 pb-3 pt-3 space-y-2.5"
          style={{ 
            animation: 'expandDown 0.2s ease-out',
            backgroundColor: '#E6DDC5',
            borderTopColor: categoryTheme.border,
          }}
        >
          {/* Primary: Cantidad a Pedir */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[#5A8070]">Cantidad a pedir</label>
              {showSuggestion && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(suggestedQty);
                  }}
                  className="text-xs text-[#47685C] bg-[#A9C9A4]/15 hover:bg-[#A9C9A4]/25 px-2 py-0.5 rounded-full active:scale-95 transition-all flex items-center gap-1"
                >
                  <TrendingUp className="w-3 h-3" strokeWidth={2} />
                  {suggestedQty}
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-lg border-2 border-[#DAD7CD] bg-white hover:bg-[#7DAA92] hover:text-white hover:border-[#7DAA92] disabled:opacity-30"
                style={{
                  transition: 'all 150ms ease-in-out'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(localQuantity - 1);
                }}
                disabled={localQuantity === 0}
                onMouseEnter={(e) => !localQuantity ? null : e.currentTarget.style.boxShadow = '0 0 12px rgba(143, 189, 165, 0.4)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = ''}
              >
                <Minus className="w-4 h-4" strokeWidth={2.5} />
              </Button>
              
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={localQuantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                onFocus={(e) => {
                  e.target.select();
                  e.target.style.outline = '1.5px solid #A9CDB6';
                  e.target.style.outlineOffset = '2px';
                  e.target.style.boxShadow = '0 0 0 3px rgba(169, 205, 182, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.outline = '';
                  e.target.style.outlineOffset = '';
                  e.target.style.boxShadow = '';
                }}
                onClick={(e) => e.stopPropagation()}
                className={`h-10 flex-1 text-center border-2 rounded-lg tabular-nums bg-white ${
                  localQuantity === 0 
                    ? 'border-[#DAD7CD] text-[#888880]' 
                    : 'border-[#7DAA92] text-[#1F1F1F]'
                }`}
                style={{
                  transition: 'all 150ms ease-in-out'
                }}
              />

              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-lg border-2 border-[#DAD7CD] bg-white hover:bg-[#7DAA92] hover:text-white hover:border-[#7DAA92]"
                style={{
                  transition: 'all 150ms ease-in-out'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(localQuantity + 1);
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 12px rgba(143, 189, 165, 0.4)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = ''}
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </Button>
            </div>
          </div>

          {/* Price & Stock Row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Price Editor */}
            <div className="bg-white rounded-lg p-2.5 border border-[#DAD7CD]">
              <label className="text-[10px] text-[#5A8070] block mb-1">Precio unit.</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#888880]">$</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={localPrice.toFixed(2)}
                  onChange={handlePriceChange}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 text-sm bg-transparent border-0 p-0 focus-visible:ring-0 text-[#1F1F1F] tabular-nums flex-1"
                />
              </div>
            </div>

            {/* Stock Editor */}
            <div className="bg-white rounded-lg p-2.5 border border-[#DAD7CD]">
              <label className="text-[10px] text-[#5A8070] block mb-1">Stock actual</label>
              <Input
                type="number"
                inputMode="numeric"
                value={localStock}
                onChange={handleStockChange}
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.stopPropagation()}
                className="h-6 text-sm border-0 p-0 focus-visible:ring-0 text-[#1F1F1F] tabular-nums bg-transparent"
              />
            </div>
          </div>

          {/* Subtotal Display */}
          <div className={`flex items-center justify-between p-2 rounded-lg transition-all duration-300 ${
            subtotalHighlight 
              ? 'bg-[#47685C]/15 ring-2 ring-[#47685C]/40' 
              : 'bg-[#F5F5F2]/60'
          }`}>
            <span className="text-xs text-[#5A8070]">Subtotal</span>
            <span className={`text-sm tabular-nums transition-colors ${
              subtotalHighlight ? 'text-[#47685C]' : 'text-[#1F1F1F]'
            }`} style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}>
              ${subtotal.toFixed(2)}
            </span>
          </div>

          {/* Analytics Stats */}
          <div className="pt-2 border-t border-[#DAD7CD]">
            <p className="text-[10px] text-[#888880] mb-1.5 uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-mono)' }}>Análisis</p>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-[#F5F5F2] rounded-lg p-1.5 border border-[#DAD7CD]/50">
                <p className="text-[9px] text-[#888880] mb-0.5">Prom/sem</p>
                <p className="text-xs text-[#1F1F1F] m-0 tabular-nums" style={{ fontFamily: 'var(--font-family-mono)' }}>{weeklyAvg}</p>
              </div>
              <div className="bg-[#F5F5F2] rounded-lg p-1.5 border border-[#DAD7CD]/50">
                <p className="text-[9px] text-[#888880] mb-0.5">2 sem.</p>
                <p className="text-xs text-[#1F1F1F] m-0 tabular-nums" style={{ fontFamily: 'var(--font-family-mono)' }}>{salesLast2Weeks}</p>
              </div>
              <div className="bg-[#F5F5F2] rounded-lg p-1.5 border border-[#DAD7CD]/50">
                <p className="text-[9px] text-[#888880] mb-0.5">30 días</p>
                <p className="text-xs text-[#1F1F1F] m-0 tabular-nums" style={{ fontFamily: 'var(--font-family-mono)' }}>{salesLast30Days}</p>
              </div>
            </div>
          </div>

          {/* Stock Verification */}
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id={`verify-${id}`}
              checked={stockVerified}
              onCheckedChange={(checked) => {
                setStockVerified(checked as boolean);
                if (checked) {
                  toast.success('Stock verificado', {
                    duration: 1200,
                    position: 'top-center',
                  });
                }
              }}
              className="h-4 w-4"
            />
            <label 
              htmlFor={`verify-${id}`}
              className="text-xs text-[#2C4653]/80 cursor-pointer select-none"
            >
              Verificado en góndola
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
