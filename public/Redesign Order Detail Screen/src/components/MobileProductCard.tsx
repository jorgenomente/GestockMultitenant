import { useState } from 'react';
import { 
  Minus, 
  Plus, 
  Edit2, 
  ChevronDown, 
  ChevronUp,
  Package,
  MoreHorizontal,
  BarChart3,
  Check
} from 'lucide-react';
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

interface MobileProductCardProps {
  product: Product;
  groupId: string;
  onUpdate: (groupId: string, productId: string, field: keyof Product, value: any) => void;
  onRemove: (groupId: string, productId: string) => void;
  onViewStats?: (product: Product) => void;
}

export function MobileProductCard({
  product,
  groupId,
  onUpdate,
  onRemove,
  onViewStats,
}: MobileProductCardProps) {
  // Estados
  const [status, setStatus] = useState<'pending' | 'ready'>('pending');
  const [isReceptionOpen, setIsReceptionOpen] = useState(false);
  const [quantityReceived, setQuantityReceived] = useState(product.orderQuantity);

  // Cálculos
  const projectedStock = product.currentStock + product.orderQuantity;
  const subtotal = product.price * product.orderQuantity;

  // Handlers
  const handleIncrement = () => {
    onUpdate(groupId, product.id, 'orderQuantity', product.orderQuantity + 1);
    toast.success('Cantidad actualizada');
  };

  const handleDecrement = () => {
    if (product.orderQuantity === 0) return;
    onUpdate(groupId, product.id, 'orderQuantity', product.orderQuantity - 1);
    toast.success('Cantidad actualizada');
  };

  const handleToggleStatus = () => {
    setStatus(status === 'pending' ? 'ready' : 'pending');
    toast.success(status === 'pending' ? 'Marcado como listo' : 'Marcado como pendiente');
  };

  const handleEditStock = () => {
    toast.info('Abriendo editor de stock...');
    // Aquí iría la lógica para abrir un modal de edición
  };

  const handleConfirmReception = () => {
    onUpdate(groupId, product.id, 'currentStock', product.currentStock + quantityReceived);
    toast.success('Recepción confirmada');
    setIsReceptionOpen(false);
  };

  return (
    <div className="w-full max-w-[92%] mx-auto">
      {/* Auto-Layout vertical - Contenedor principal */}
      <div className="flex flex-col gap-3.5 bg-white rounded-[14px] shadow-sm border border-[#EAEAEA] p-4">
        
        {/* 1. HEADER SUPERIOR - Nombre | Badge | Toggle */}
        <div className="flex items-center justify-between gap-2">
          {/* Nombre del producto - truncado 1 línea */}
          <h3 className="flex-1 text-sm font-semibold text-[#0E2E2B] truncate min-w-0">
            {product.name}
          </h3>

          {/* Badge pequeño gris suave */}
          <Badge 
            variant="outline"
            className="flex-shrink-0 h-5 px-2 text-[10px] bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB] rounded-full"
          >
            {status === 'pending' ? 'Pendiente' : 'Listo'}
          </Badge>

          {/* Toggle redondo */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleStatus}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    status === 'ready'
                      ? 'bg-[#ECFDF5] border-[#27AE60]'
                      : 'bg-white border-[#D1D5DB]'
                  }`}
                >
                  {status === 'ready' && (
                    <Check className="w-3.5 h-3.5 text-[#27AE60]" strokeWidth={3} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {status === 'pending' ? 'Marcar listo' : 'Desmarcar'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* 2. SECCIÓN DE STOCK - Dos tarjetas del mismo alto, lado a lado */}
        <div className="flex items-stretch gap-3">
          {/* A: Stock actual - Cajita gris con edit */}
          <button
            onClick={handleEditStock}
            className="flex-1 flex items-center justify-between min-h-[44px] px-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg hover:border-[#D1D5DB] transition-colors"
          >
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[9px] text-[#9CA3AF] leading-none mb-0.5">Stock actual</span>
              <span className="text-lg font-bold text-[#0E2E2B] leading-tight">
                {product.currentStock} u
              </span>
            </div>
            <Edit2 className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0 ml-1" />
          </button>

          {/* B: Stock proyectado - Cajita verde compacta (máx 45%) */}
          <div className="w-[45%] flex items-center justify-center min-h-[44px] px-2.5 py-2 bg-[#E8F6F0] border border-[#C6F6D5] rounded-lg">
            <div className="flex flex-col items-center text-center">
              <span className="text-[9px] text-[#6B7280] leading-none mb-0.5">Proyectado</span>
              <span className="text-lg font-bold text-[#27AE60] leading-tight">
                {projectedStock}
              </span>
            </div>
          </div>
        </div>

        {/* 3. CANTIDAD + SUBTOTAL - Una sola fila */}
        <div className="flex items-center justify-between gap-3">
          {/* Selector de cantidad */}
          <div className="flex items-center gap-1 bg-[#F9FAFB] rounded-lg px-1 py-1 border border-[#E5E7EB]">
            <button
              onClick={handleDecrement}
              disabled={product.orderQuantity === 0}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-white hover:text-[#EF4444] disabled:opacity-30 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-base font-bold text-[#0E2E2B] min-w-[32px] text-center">
              {product.orderQuantity}
            </span>
            <button
              onClick={handleIncrement}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-white hover:text-[#27AE60] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Subtotal y precio unitario */}
          <div className="flex flex-col items-end">
            <span className="text-base font-bold text-[#0E2E2B] leading-tight">
              ${subtotal.toLocaleString('es-ES')}
            </span>
            <span className="text-[10px] text-[#9CA3AF] leading-tight">
              ${product.price.toLocaleString('es-ES')} / u
            </span>
          </div>
        </div>

        {/* 4. SUGERIDOS - Una línea compacta */}
        {product.sales && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[#F9FAFB] rounded-lg">
            <BarChart3 className="w-3.5 h-3.5 text-[#6B7280] flex-shrink-0" />
            <span className="text-[11px] text-[#6B7280]">
              Sugerido: <span className="font-medium">7d {product.sales.last7Days}u</span> | <span className="font-medium">30d {product.sales.last30Days}u</span>
            </span>
          </div>
        )}

        {/* 5. AJUSTAR RECEPCIÓN - Accordion limpio */}
        <div>
          <button
            onClick={() => setIsReceptionOpen(!isReceptionOpen)}
            className="w-full flex items-center justify-between px-2 py-2 hover:bg-[#F9FAFB] rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#6B7280]" />
              <span className="text-xs text-[#6B7280]">Ajustar recepción</span>
            </div>
            {isReceptionOpen ? (
              <ChevronUp className="w-4 h-4 text-[#9CA3AF]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
            )}
          </button>

          {/* Contenido del accordion */}
          <div 
            className={`overflow-hidden transition-all duration-200 ${
              isReceptionOpen ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-3 py-3 bg-[#F9FAFB] rounded-lg space-y-2.5">
              <p className="text-[11px] text-[#6B7280]">
                Ajusta las cantidades si hubo diferencias
              </p>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-[#9CA3AF] block mb-1">Pedido</label>
                  <div className="h-9 px-2 bg-white border border-[#E5E7EB] rounded-lg flex items-center justify-center text-sm text-[#6B7280]">
                    {product.orderQuantity}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-[#9CA3AF] block mb-1">Recibido</label>
                  <input
                    type="number"
                    value={quantityReceived}
                    onChange={(e) => setQuantityReceived(parseInt(e.target.value) || 0)}
                    className="h-9 px-2 w-full bg-white border border-[#E5E7EB] rounded-lg text-sm text-center font-medium focus:outline-none focus:border-[#27AE60]"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-[#9CA3AF] block mb-1">Dif.</label>
                  <div className={`h-9 px-1 rounded-lg flex items-center justify-center text-sm font-medium ${
                    quantityReceived - product.orderQuantity === 0
                      ? 'bg-white border border-[#E5E7EB] text-[#6B7280]'
                      : quantityReceived - product.orderQuantity > 0
                      ? 'bg-[#FEF3C7] border border-[#FDE68A] text-[#F59E0B]'
                      : 'bg-[#FEE2E2] border border-[#FECACA] text-[#EF4444]'
                  }`}>
                    {quantityReceived - product.orderQuantity === 0 
                      ? '—' 
                      : (quantityReceived - product.orderQuantity > 0 ? '+' : '') + 
                        (quantityReceived - product.orderQuantity)}
                  </div>
                </div>
              </div>

              <button
                onClick={handleConfirmReception}
                className="w-full h-9 bg-[#27AE60] text-white hover:bg-[#229954] rounded-lg text-xs font-medium transition-colors"
              >
                Confirmar recepción
              </button>
            </div>
          </div>
        </div>

        {/* 6. VER MÁS - Botón texto con tres puntos, alineado derecha */}
        {onViewStats && (
          <div className="flex justify-end">
            <button
              onClick={() => onViewStats(product)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#27AE60] hover:text-[#229954] transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              <span>Ver más</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
