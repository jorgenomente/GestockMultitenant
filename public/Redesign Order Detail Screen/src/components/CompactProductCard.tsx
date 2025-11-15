import { useState } from 'react';
import { 
  Trash2, 
  Minus, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Package,
  MoreVertical,
  Check,
  Save,
  Edit2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Product } from '../App';
import { toast } from 'sonner@2.0.3';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { MobileProductCard } from './MobileProductCard';

interface CompactProductCardProps {
  product: Product;
  groupId: string;
  onUpdate: (groupId: string, productId: string, field: keyof Product, value: any) => void;
  onRemove: (groupId: string, productId: string) => void;
  onViewStats?: (product: Product) => void;
  mobile?: boolean;
}

// Estado del componente ProductCard - Component Set
type ProductCardStatus = 'pending' | 'complete' | 'error';

export function CompactProductCard({
  product,
  groupId,
  onUpdate,
  onRemove,
  onViewStats,
  mobile = false,
}: CompactProductCardProps) {
  // Si es mobile, usar el nuevo componente
  if (mobile) {
    return (
      <MobileProductCard
        product={product}
        groupId={groupId}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onViewStats={onViewStats}
      />
    );
  }

  // Estados del componente
  const [quantityReceived, setQuantityReceived] = useState(product.orderQuantity);
  const [isReceptionExpanded, setIsReceptionExpanded] = useState(false);
  const [stockUpdated, setStockUpdated] = useState(false);
  
  // Estados para edición de stock
  const [isEditingStock, setIsEditingStock] = useState(false);
  const [editedStock, setEditedStock] = useState(product.currentStock);
  const [lastStockUpdate, setLastStockUpdate] = useState<Date | null>(null);
  
  // Component Set Properties
  const [status, setStatus] = useState<ProductCardStatus>('pending');
  const [showCompleteLine, setShowCompleteLine] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [checkHovered, setCheckHovered] = useState(false);
  const [checkPressed, setCheckPressed] = useState(false);

  // Calculate values
  const projectedStock = product.currentStock + quantityReceived;
  const stockVariation = quantityReceived;
  const difference = quantityReceived - product.orderQuantity;

  // Determine suggested status
  const getSuggestedStatus = () => {
    if (difference === 0) return { label: 'Correcto', color: 'text-[#27AE60]' };
    if (quantityReceived === 0) return { label: 'Faltante', color: 'text-[#EF4444]' };
    if (difference < 0) return { label: 'Parcial', color: 'text-[#F59E0B]' };
    return { label: 'Diferencia', color: 'text-[#F59E0B]' };
  };

  const suggestedStatus = getSuggestedStatus();
  const subtotal = product.price * product.orderQuantity;

  // Format last update date
  const formatLastUpdate = (date: Date | null) => {
    if (!date) return null;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  };

  // Handlers para interactividad
  const handleIncrement = () => {
    onUpdate(groupId, product.id, 'orderQuantity', product.orderQuantity + 1);
    setQuantityReceived(product.orderQuantity + 1);
    toast.success('Cantidad actualizada');
  };

  const handleDecrement = () => {
    if (product.orderQuantity === 0) return;
    onUpdate(groupId, product.id, 'orderQuantity', product.orderQuantity - 1);
    setQuantityReceived(product.orderQuantity - 1);
    toast.success('Cantidad actualizada');
  };

  const handleReceivedChange = (value: number) => {
    setQuantityReceived(Math.max(0, value));
  };

  // Handler para guardar stock editado
  const handleSaveStock = () => {
    if (editedStock !== product.currentStock) {
      onUpdate(groupId, product.id, 'currentStock', editedStock);
      setLastStockUpdate(new Date());
      toast.success('Stock actualizado manualmente');
      
      // Trigger highlight animation
      setStockUpdated(true);
      setTimeout(() => setStockUpdated(false), 1000);
    }
    setIsEditingStock(false);
  };

  // Handler para cancelar edición
  const handleCancelEditStock = () => {
    setEditedStock(product.currentStock);
    setIsEditingStock(false);
  };

  const handleConfirmReception = () => {
    // Update the actual stock with the received quantity
    onUpdate(groupId, product.id, 'currentStock', product.currentStock + quantityReceived);
    
    // Show success toast
    toast.success('Stock actualizado correctamente');
    
    // Trigger highlight animation
    setStockUpdated(true);
    setIsReceptionExpanded(false);
    
    // Update last stock update time
    setLastStockUpdate(new Date());
    
    // Determinar estado basado en diferencia
    if (difference === 0) {
      handleStatusChange('complete');
    } else if (Math.abs(difference) > 5) {
      handleStatusChange('error');
    }
    
    // Remove highlight after 1 second
    setTimeout(() => {
      setStockUpdated(false);
    }, 1000);
  };

  // Handler para cambio de estado con microinteracciones
  const handleStatusChange = (newStatus: ProductCardStatus) => {
    const previousStatus = status;
    setStatus(newStatus);
    setIsAnimating(true);

    // Si cambia a complete, mostrar línea de refuerzo
    if (newStatus === 'complete' && previousStatus !== 'complete') {
      setShowCompleteLine(true);
      setTimeout(() => setShowCompleteLine(false), 120);
    }

    // Terminar animación
    setTimeout(() => setIsAnimating(false), 180);
  };

  // Handler para toggle del check icon
  const handleCheckToggle = () => {
    setCheckPressed(true);
    
    setTimeout(() => {
      setCheckPressed(false);
      
      if (status === 'pending') {
        handleStatusChange('complete');
        toast.success('Producto marcado como completo');
      } else if (status === 'complete') {
        handleStatusChange('pending');
        toast.info('Producto desmarcado');
      } else if (status === 'error') {
        handleStatusChange('complete');
      }
    }, 90);
  };

  // Estilos basados en el estado
  const getCardStyles = () => {
    switch (status) {
      case 'pending':
        return {
          container: 'bg-white border border-[#E8E9E4]',
          containerHover: 'hover:border-[#D1D5DB]',
          shadow: '',
          badge: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]',
          badgeText: 'Pendiente',
        };
      case 'complete':
        return {
          container: 'bg-[#F5FBF7] border-2 border-[#D7F5E5]',
          containerHover: '',
          shadow: 'shadow-[0_1px_4px_rgba(0,160,90,0.12)]',
          badge: 'bg-[#E3F9ED] text-[#31C16B] border-[#D7F5E5]',
          badgeText: 'Completo',
        };
      case 'error':
        return {
          container: 'bg-[#FFF7F5] border-2 border-[#FFD3C7]',
          containerHover: '',
          shadow: 'shadow-[0_1px_4px_rgba(208,80,80,0.12)]',
          badge: 'bg-[#FEE2E2] text-[#D05050] border-[#FFD3C7]',
          badgeText: 'Revisar',
        };
      default:
        return {
          container: 'bg-white border border-[#E8E9E4]',
          containerHover: 'hover:border-[#D1D5DB]',
          shadow: '',
          badge: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]',
          badgeText: 'Pendiente',
        };
    }
  };

  const cardStyles = getCardStyles();

  // Renderizado DESKTOP
  if (!mobile) {
    return (
      <div 
        className={`rounded-2xl transition-all duration-180 ease-out relative ${cardStyles.container} ${cardStyles.containerHover} ${cardStyles.shadow}`}
        style={{
          animation: isAnimating ? 'statusChange 180ms ease-out' : 'none',
        }}
      >
        {/* Línea de refuerzo al completar */}
        {showCompleteLine && (
          <div 
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#31C16B] to-transparent pointer-events-none"
            style={{
              animation: 'completeLine 120ms ease-out'
            }}
          />
        )}

        {/* Indicador de estado en esquina superior derecha */}
        {status !== 'pending' && (
          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            <div className={`w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center shadow-sm transition-all duration-180 ${
              status === 'complete' ? 'border-[#D7F5E5]' : 'border-[#FFD3C7]'
            }`}>
              {status === 'complete' && (
                <Check className="w-3.5 h-3.5 text-[#31C16B]" strokeWidth={3} />
              )}
              {status === 'error' && (
                <AlertTriangle className="w-3.5 h-3.5 text-[#D05050]" strokeWidth={2.5} />
              )}
            </div>
          </div>
        )}

        {/* Main card - OPTIMIZADO */}
        <div className="p-3.5">
          {/* Header: Product name + Badge + Check */}
          <div className="flex items-start justify-between gap-4 mb-2.5">
            <div className="flex-1 min-w-0">
              <h4 className="text-[#0E2E2B] truncate">{product.name}</h4>
            </div>

            {/* Right side controls: Badge + Checkable toggle */}
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline"
                className={`text-xs h-5 px-2 border transition-all duration-180 ${cardStyles.badge}`}
              >
                {cardStyles.badgeText}
              </Badge>

              {/* Checkable circular toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleCheckToggle}
                      onMouseEnter={() => setCheckHovered(true)}
                      onMouseLeave={() => setCheckHovered(false)}
                      className={`relative z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-180 cursor-pointer ${
                        status === 'complete'
                          ? 'bg-[#ECFDF5] border-[#31C16B]' 
                          : checkHovered
                          ? 'bg-transparent border-[#6B7280] shadow-[0_0_0_3px_rgba(107,114,128,0.1)]'
                          : 'bg-transparent border-[#D1D5DB]'
                      } ${
                        checkPressed ? 'scale-94' : 'scale-100'
                      }`}
                      style={{
                        animation: status === 'complete' && isAnimating ? 'checkRipple 180ms ease-out' : 'none',
                        pointerEvents: 'auto',
                      }}
                    >
                      {status === 'complete' && (
                        <Check className="w-3.5 h-3.5 text-[#31C16B]" strokeWidth={3} />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="bg-[#1F2937] text-white text-xs px-2 py-1 rounded"
                  >
                    {status === 'complete' ? 'Desmarcar producto' : 'Marcar como procesado'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* NUEVA FILA: Stock editable + Stock proyectado */}
          <div className="flex items-start gap-3 mb-2.5 pb-2.5 border-b border-[#F3F4F6]">
            {/* Stock actual editable */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {!isEditingStock ? (
                  <>
                    <div 
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 bg-[#F9FAF9] border border-[#E5E7EB] transition-all duration-1000 ${
                        stockUpdated ? 'bg-[#ECFDF5] border-[#C6F6D5]' : ''
                      }`}
                    >
                      <span className="text-xs text-[#9CA3AF]">Stock actual</span>
                      <span className="text-sm text-[#0E2E2B] font-medium">{product.currentStock} u</span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setIsEditingStock(true)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#27AE60] hover:bg-[#F3F4F6] transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="bg-[#1F2937] text-white text-xs px-2 py-1 rounded"
                        >
                          Editar stock manualmente
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-[#D8DFE6] focus-within:border-[#27AE60]">
                      <span className="text-xs text-[#9CA3AF]">Stock</span>
                      <Input
                        type="number"
                        value={editedStock}
                        onChange={(e) => setEditedStock(parseInt(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveStock();
                          if (e.key === 'Escape') handleCancelEditStock();
                        }}
                        className="h-6 w-16 text-sm border-0 p-0 text-center font-medium focus-visible:ring-0"
                        autoFocus
                      />
                      <span className="text-xs text-[#9CA3AF]">u</span>
                    </div>
                    <button
                      onClick={handleSaveStock}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white bg-[#27AE60] hover:bg-[#229954] transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={handleCancelEditStock}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-colors"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              
              {/* Última actualización manual */}
              {lastStockUpdate && (
                <p className="text-[9px] text-[#9CA3AF] mt-1 ml-3">
                  Última actualización manual: {formatLastUpdate(lastStockUpdate)}
                </p>
              )}
            </div>

            {/* Stock proyectado - al lado */}
            <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 border ${
              projectedStock > product.currentStock 
                ? 'bg-[#E8F6F0] border-[#C6F6D5]' 
                : projectedStock < product.currentStock 
                ? 'bg-[#FEE2E2] border-[#FECACA]' 
                : 'bg-[#F3F4F6] border-[#E5E7EB]'
            }`}>
              <span className="text-xs text-[#6B7280]">Stock proyectado</span>
              <span className="text-xs text-[#9CA3AF]">→</span>
              <span className={`text-sm font-medium ${
                projectedStock > product.currentStock 
                  ? 'text-[#2FB57E]' 
                  : projectedStock < product.currentStock 
                  ? 'text-[#EF4444]' 
                  : 'text-[#6B7280]'
              }`}>
                {projectedStock}
              </span>
              
              {stockVariation !== 0 && (
                <span className={`text-xs font-medium ${
                  stockVariation > 0 ? 'text-[#2FB57E]' : 'text-[#EF4444]'
                }`}>
                  ({stockVariation > 0 ? '+' : ''}{stockVariation})
                </span>
              )}
            </div>
          </div>

          {/* NUEVA FILA: Selector cantidad + Subtotal y Precio unitario */}
          <div className="flex items-center justify-between mb-2.5">
            {/* Selector de pedido */}
            <div className="flex items-center gap-1 bg-[#F9FAF9] rounded-lg px-2 py-1 border border-[#E5E7EB]">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDecrement}
                disabled={product.orderQuantity === 0}
                className="h-6 w-6 p-0 hover:bg-white hover:text-[#EF4444] disabled:opacity-30 transition-all duration-150"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="text-[#0E2E2B] min-w-[32px] text-center font-medium text-sm">
                {product.orderQuantity}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleIncrement}
                className="h-6 w-6 p-0 hover:bg-white hover:text-[#27AE60] transition-all duration-150"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            {/* Subtotal y Precio unitario */}
            <div className="flex items-center gap-2 text-sm">
              <div className="text-right">
                <span className="text-[#9CA3AF] text-xs">Subtotal </span>
                <span className="text-[#0E2E2B] font-medium">${subtotal.toLocaleString('es-ES')}</span>
              </div>
              <span className="text-[#E5E7EB]">|</span>
              <div className="text-right">
                <span className="text-[#9CA3AF] text-xs">Precio u. </span>
                <span className="text-[#6B7280]">${product.price.toLocaleString('es-ES')}</span>
              </div>
            </div>
          </div>

          {/* Pedido sugerido + Sales + Menu */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toast.info('Calculando pedido sugerido...')}
                className="text-xs text-[#6B7280] hover:text-[#27AE60] transition-colors"
              >
                Pedido sugerido
              </button>
              
              {product.sales && (
                <>
                  <span className="text-xs text-[#E5E7EB]">|</span>
                  <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                    <span>7d: {product.sales.last7Days}</span>
                    <span>•</span>
                    <span>30d: {product.sales.last30Days}</span>
                    {onViewStats && (
                      <button
                        onClick={() => onViewStats(product)}
                        className="text-[#27AE60] hover:text-[#229954] flex items-center gap-1 ml-1 transition-colors"
                      >
                        <BarChart3 className="w-3 h-3" />
                        Ver más
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Menú contextual */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F3F4F6] transition-all duration-150"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuItem
                  onClick={() => onRemove(groupId, product.id)}
                  className="text-[#EF4444] focus:text-[#DC2626] focus:bg-[#FEE2E2] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar producto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Toggle button for reception */}
        {!isReceptionExpanded && (
          <div className="px-3.5 pb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReceptionExpanded(true)}
              className="w-full h-7 text-xs text-[#6B7280] hover:text-[#27AE60] hover:bg-[#F8FAF9] border border-[#E5E7EB] rounded-lg transition-all duration-150"
            >
              <Package className="w-3.5 h-3.5 mr-1.5" />
              Ajustar recepción
              <ChevronDown className="w-3.5 h-3.5 ml-auto" />
            </Button>
          </div>
        )}

        {/* Reception block */}
        <div 
          className={`overflow-hidden transition-all duration-200 ease-out ${
            isReceptionExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#27AE60]" />
                <h5 className="text-sm text-[#0E2E2B] font-medium">Recepción del producto</h5>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReceptionExpanded(false)}
                className="h-6 w-6 p-0 text-[#6B7280] hover:bg-white hover:text-[#0E2E2B]"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-xs text-[#9CA3AF] mb-3">
              Si el producto llegó correctamente, no hace falta editar este campo.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <Label className="text-xs text-[#9CA3AF] mb-1.5 block">Pedido</Label>
                <div className="text-sm text-[#6B7280] bg-[#F3F4F6] rounded-lg px-3 py-2 border border-[#E5E7EB] text-center">
                  {product.orderQuantity}
                </div>
              </div>

              <div>
                <Label className="text-xs text-[#9CA3AF] mb-1.5 block">Recibido</Label>
                <Input
                  type="number"
                  value={quantityReceived}
                  onChange={(e) => handleReceivedChange(parseInt(e.target.value) || 0)}
                  className="text-sm border-[#D8DFE6] focus:border-[#27AE60] focus:ring-[#27AE60] h-[38px] text-center font-medium"
                />
              </div>

              <div>
                <Label className="text-xs text-[#9CA3AF] mb-1.5 block">Diferencia</Label>
                <div className={`text-sm font-medium rounded-lg px-3 py-2 border text-center ${
                  difference === 0 
                    ? 'bg-white text-[#6B7280] border-[#E5E7EB]' 
                    : difference > 0 
                    ? 'bg-[#FEF3C7] text-[#F59E0B] border-[#FDE68A]'
                    : 'bg-[#FEE2E2] text-[#EF4444] border-[#FECACA]'
                }`}>
                  {difference === 0 ? '—' : difference > 0 ? `+${difference}` : difference}
                </div>
              </div>
            </div>

            <div className="mb-3 px-3 py-2 bg-white rounded-lg border border-[#E5E7EB]">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#9CA3AF]">Estado sugerido:</span>
                <span className={`font-medium ${suggestedStatus.color}`}>
                  {suggestedStatus.label}
                </span>
                {difference === 0 && (
                  <CheckCircle2 className="w-4 h-4 text-[#27AE60] ml-auto" />
                )}
                {difference !== 0 && (
                  <AlertCircle className="w-4 h-4 text-[#F59E0B] ml-auto" />
                )}
              </div>
            </div>

            <Button
              onClick={handleConfirmReception}
              className="w-full h-9 bg-[#27AE60] text-white hover:bg-[#229954] font-medium transition-all duration-150"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirmar recepción real
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Renderizado MOBILE - OPTIMIZADO
  return (
    <div 
      className={`rounded-2xl transition-all duration-180 ease-out relative ${cardStyles.container} ${cardStyles.containerHover} ${cardStyles.shadow}`}
      style={{
        animation: isAnimating ? 'statusChange 180ms ease-out' : 'none',
      }}
    >
      {/* Línea de refuerzo al completar */}
      {showCompleteLine && (
        <div 
          className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#31C16B] to-transparent pointer-events-none"
          style={{
            animation: 'completeLine 120ms ease-out'
          }}
        />
      )}

      {/* Main card - Layout Mobile OPTIMIZADO */}
      <div className="p-3">
        {/* Header: Título, Badge y Check */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0">
            <h4 className="text-[#0E2E2B] truncate text-sm">{product.name}</h4>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge 
              variant="outline"
              className={`text-xs h-5 px-2 border transition-all duration-180 ${cardStyles.badge}`}
            >
              {cardStyles.badgeText}
            </Badge>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCheckToggle}
                    className={`relative z-20 w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-180 cursor-pointer ${
                      status === 'complete'
                        ? 'bg-[#ECFDF5] border-[#31C16B]' 
                        : checkHovered
                        ? 'bg-transparent border-[#6B7280] shadow-[0_0_0_3px_rgba(107,114,128,0.1)]'
                        : 'bg-transparent border-[#D1D5DB]'
                    } ${
                      checkPressed ? 'scale-94' : 'scale-100'
                    }`}
                    style={{
                      animation: status === 'complete' && isAnimating ? 'checkRipple 180ms ease-out' : 'none',
                      pointerEvents: 'auto',
                    }}
                  >
                    {status === 'complete' && (
                      <Check className="w-5 h-5 text-[#31C16B]" strokeWidth={3} />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-[#1F2937] text-white text-xs px-2 py-1 rounded">
                  {status === 'complete' ? 'Desmarcar' : 'Marcar'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Stock actual editable */}
        <div className="mb-2">
          {!isEditingStock ? (
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 bg-[#F9FAF9] border border-[#E5E7EB] transition-all duration-1000 ${
                stockUpdated ? 'bg-[#ECFDF5] border-[#C6F6D5]' : ''
              }`}>
                <span className="text-xs text-[#9CA3AF]">Stock actual</span>
                <span className="text-sm text-[#0E2E2B] font-medium">{product.currentStock} u</span>
              </div>
              <button
                onClick={() => setIsEditingStock(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#27AE60] hover:bg-[#F3F4F6] transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1.5 border border-[#D8DFE6] focus-within:border-[#27AE60]">
                <span className="text-xs text-[#9CA3AF]">Stock</span>
                <Input
                  type="number"
                  value={editedStock}
                  onChange={(e) => setEditedStock(parseInt(e.target.value) || 0)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveStock();
                    if (e.key === 'Escape') handleCancelEditStock();
                  }}
                  className="h-7 w-16 text-sm border-0 p-0 text-center font-medium focus-visible:ring-0"
                  autoFocus
                />
                <span className="text-xs text-[#9CA3AF]">u</span>
              </div>
              <button
                onClick={handleSaveStock}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-[#27AE60] hover:bg-[#229954] transition-colors"
              >
                <Check className="w-4 h-4" strokeWidth={2.5} />
              </button>
              <button
                onClick={handleCancelEditStock}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-colors text-lg"
              >
                ×
              </button>
            </div>
          )}
          
          {lastStockUpdate && (
            <p className="text-[9px] text-[#9CA3AF] mt-1 ml-3">
              Última actualización: {formatLastUpdate(lastStockUpdate)}
            </p>
          )}
        </div>

        {/* Stock proyectado - ancho completo */}
        <div className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 border mb-2.5 ${
          projectedStock > product.currentStock 
            ? 'bg-[#E8F6F0] border-[#C6F6D5]' 
            : projectedStock < product.currentStock 
            ? 'bg-[#FEE2E2] border-[#FECACA]' 
            : 'bg-[#F3F4F6] border-[#E5E7EB]'
        }`}>
          <span className="text-xs text-[#6B7280]">Stock proyectado</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#9CA3AF]">→</span>
            <span className={`text-sm font-medium ${
              projectedStock > product.currentStock 
                ? 'text-[#2FB57E]' 
                : projectedStock < product.currentStock 
                ? 'text-[#EF4444]' 
                : 'text-[#6B7280]'
            }`}>
              {projectedStock}
            </span>
            {stockVariation !== 0 && (
              <span className={`text-xs font-medium ${
                stockVariation > 0 ? 'text-[#2FB57E]' : 'text-[#EF4444]'
              }`}>
                ({stockVariation > 0 ? '+' : ''}{stockVariation})
              </span>
            )}
          </div>
        </div>

        {/* Selector cantidad */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#F3F4F6]">
          <span className="text-xs text-[#9CA3AF]">Cantidad a pedir</span>
          <div className="flex items-center gap-1 bg-[#F9FAF9] rounded-lg px-1.5 py-1 border border-[#E5E7EB]">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDecrement}
              disabled={product.orderQuantity === 0}
              className="h-9 w-9 p-0 hover:bg-white hover:text-[#EF4444] disabled:opacity-30"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-[#0E2E2B] min-w-[40px] text-center font-medium">
              {product.orderQuantity}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleIncrement}
              className="h-9 w-9 p-0 hover:bg-white hover:text-[#27AE60]"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Subtotal y Precio unitario - stack vertical */}
        <div className="flex flex-col gap-1 mb-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">Subtotal</span>
            <span className="text-[#0E2E2B] font-medium">${subtotal.toLocaleString('es-ES')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">Precio unitario</span>
            <span className="text-[#6B7280]">${product.price.toLocaleString('es-ES')}</span>
          </div>
        </div>

        {/* Pedido sugerido + Menu */}
        <div className="flex items-center justify-between mb-2.5">
          <button
            onClick={() => toast.info('Calculando pedido sugerido...')}
            className="text-xs text-[#6B7280] hover:text-[#27AE60] transition-colors"
          >
            Pedido sugerido
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F3F4F6]"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem
                onClick={() => onRemove(groupId, product.id)}
                className="text-[#EF4444] focus:text-[#DC2626] focus:bg-[#FEE2E2] cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar producto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Toggle button for reception */}
        {!isReceptionExpanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsReceptionExpanded(true)}
            className="w-full h-10 text-sm text-[#6B7280] hover:text-[#27AE60] hover:bg-[#F8FAF9] border border-[#E5E7EB] rounded-lg"
          >
            <Package className="w-4 h-4 mr-2" />
            Ajustar recepción
            <ChevronDown className="w-4 h-4 ml-auto" />
          </Button>
        )}

        {/* Reception block - Mobile */}
        <div 
          className={`overflow-hidden transition-all duration-200 ease-out ${
            isReceptionExpanded ? 'max-h-[400px] opacity-100 mt-3' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3 -mx-3 rounded-b-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#27AE60]" />
                <h5 className="text-sm text-[#0E2E2B] font-medium">Recepción</h5>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReceptionExpanded(false)}
                className="h-8 w-8 p-0 text-[#6B7280] hover:bg-white hover:text-[#0E2E2B]"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-xs text-[#9CA3AF] mb-3">
              Si el producto llegó correctamente, no hace falta editar este campo.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <Label className="text-xs text-[#9CA3AF] mb-1.5 block">Pedido</Label>
                <div className="text-sm text-[#6B7280] bg-[#F3F4F6] rounded-lg px-2 py-2 border border-[#E5E7EB] text-center">
                  {product.orderQuantity}
                </div>
              </div>

              <div>
                <Label className="text-xs text-[#9CA3AF] mb-1.5 block">Recibido</Label>
                <Input
                  type="number"
                  value={quantityReceived}
                  onChange={(e) => handleReceivedChange(parseInt(e.target.value) || 0)}
                  className="text-sm border-[#D8DFE6] focus:border-[#27AE60] focus:ring-[#27AE60] h-[38px] text-center font-medium"
                />
              </div>

              <div>
                <Label className="text-xs text-[#9CA3AF] mb-1.5 block">Diff</Label>
                <div className={`text-sm font-medium rounded-lg px-2 py-2 border text-center ${
                  difference === 0 
                    ? 'bg-white text-[#6B7280] border-[#E5E7EB]' 
                    : difference > 0 
                    ? 'bg-[#FEF3C7] text-[#F59E0B] border-[#FDE68A]'
                    : 'bg-[#FEE2E2] text-[#EF4444] border-[#FECACA]'
                }`}>
                  {difference === 0 ? '—' : difference > 0 ? `+${difference}` : difference}
                </div>
              </div>
            </div>

            <Button
              onClick={handleConfirmReception}
              className="w-full h-10 bg-[#27AE60] text-white hover:bg-[#229954] font-medium"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirmar recepción
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}