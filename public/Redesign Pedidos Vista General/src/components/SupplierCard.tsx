import { Eye, CheckCircle, Edit2, Trash2, MoreVertical, Calendar, Copy, Check, User as UserIcon, Package, ChevronDown } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import type { Supplier } from "../App";

interface SupplierCardProps {
  supplier: Supplier;
  isCompactMode?: boolean;
  onDelete: () => void;
  onUpdateStatus: () => void;
  onDuplicateOrder: () => void;
  onEdit: () => void;
}

// Generate consistent color for each person
const getAvatarColor = (name: string) => {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-red-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function SupplierCard({
  supplier,
  isCompactMode = false,
  onDelete,
  onUpdateStatus,
  onDuplicateOrder,
  onEdit,
}: SupplierCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [clientBlockHovered, setClientBlockHovered] = useState(false);
  const [isClientBlockExpanded, setIsClientBlockExpanded] = useState(true);

  const statusConfig = {
    pendiente: {
      label: "Pendiente",
      className: "bg-gray-100 text-gray-700 hover:bg-gray-100",
    },
    realizado: {
      label: "Realizado",
      className: "bg-green-100 text-green-700 hover:bg-green-100",
    },
  };

  const frequencyConfig = {
    semanal: { label: "Semanal", className: "bg-blue-50 text-blue-700" },
    quincenal: { label: "Quincenal", className: "bg-purple-50 text-purple-700" },
    mensual: { label: "Mensual", className: "bg-orange-50 text-orange-700" },
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    if (diff < 0 && diff > -200) {
      setSwipeX(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (swipeX < -80) {
      setSwipeX(-160);
    } else {
      setSwipeX(0);
    }
  };

  if (isCompactMode) {
    return (
      <div
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="transition-transform duration-200"
          style={{ transform: `translateX(${swipeX}px)` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-[#0E2E2B] text-base truncate">{supplier.name}</h3>
                <Badge className={statusConfig[supplier.status].className}>
                  {statusConfig[supplier.status].label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{supplier.orderDate}</span>
              </div>
            </div>

            {/* Desktop Hover Quick Actions */}
            {isHovered && (
              <div className="hidden lg:flex items-center gap-1 ml-2 animate-in fade-in slide-in-from-right-2 duration-200">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={onEdit}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={onDuplicateOrder}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Repetir pedido</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={onDelete}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Swipe Actions */}
        <div className="absolute right-0 top-0 bottom-0 flex items-center gap-2 pr-2 lg:hidden">
          <Button
            onClick={() => {
              onEdit();
              setSwipeX(0);
            }}
            size="sm"
            className="h-10 w-10 p-0 rounded-xl bg-gray-600 hover:bg-gray-700 text-white"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => {
              onDuplicateOrder();
              setSwipeX(0);
            }}
            size="sm"
            className="h-10 w-10 p-0 rounded-xl bg-[#2FB6A0] hover:bg-[#2FB6A0]/90 text-white"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => {
              onDelete();
              setSwipeX(0);
            }}
            size="sm"
            className="h-10 w-10 p-0 rounded-xl bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="transition-transform duration-200"
        style={{ transform: `translateX(${swipeX}px)` }}
      >
        {/* Desktop Floating Quick Actions */}
        {isHovered && (
          <div className="hidden lg:flex absolute -right-2 top-6 flex-col gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onEdit}
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 shadow-md"
                  >
                    <Edit2 className="w-4 h-4 text-gray-700" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Editar</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onDuplicateOrder}
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 shadow-md"
                  >
                    <Copy className="w-4 h-4 text-gray-700" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Repetir pedido</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onDelete}
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl bg-white border border-red-200 hover:bg-red-50 shadow-md"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Eliminar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-[#0E2E2B] mb-3">{supplier.name}</h3>

            {/* Date Indicator */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
              <Calendar className="w-4 h-4 text-[#6B6B6B]" />
              <span className="text-[13px] text-[#6B6B6B]">Pedido: {supplier.orderDate}</span>
            </div>

            {/* Client Order Information - Rediseñado con estilo cuadrado y colapsable */}
            {supplier.clientOrder && (
              <motion.div
                className="mb-4 border border-[#E0E4E3] bg-[#F8FAF9] rounded-lg overflow-hidden transition-all duration-200"
                onMouseEnter={() => setClientBlockHovered(true)}
                onMouseLeave={() => setClientBlockHovered(false)}
                style={{
                  boxShadow: clientBlockHovered ? "0 1px 4px rgba(0,0,0,0.05)" : "none",
                  backgroundColor: clientBlockHovered ? "#F3F6F5" : "#F8FAF9",
                }}
              >
                {/* Header - Always visible */}
                <button
                  onClick={() => setIsClientBlockExpanded(!isClientBlockExpanded)}
                  className="w-full px-3 py-3 lg:px-4 lg:py-3.5 flex items-center justify-between hover:bg-[#F3F6F5] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-[#444]" />
                    <span className="text-[13px] text-[#444]">Cliente y productos solicitados</span>
                  </div>
                  <motion.div
                    animate={{ rotate: isClientBlockExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <ChevronDown className="w-4 h-4 text-[#666]" />
                  </motion.div>
                </button>

                {/* Collapsible Content */}
                <motion.div
                  initial={false}
                  animate={{
                    height: isClientBlockExpanded ? "auto" : 0,
                    opacity: isClientBlockExpanded ? 1 : 0,
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 lg:px-4 lg:pb-4 space-y-2.5">
                    {/* Client Name */}
                    <div className="flex items-center gap-2 py-1">
                      <UserIcon className="w-3.5 h-3.5 text-[#555] flex-shrink-0" />
                      <span className="text-[13px] text-[#333]">{supplier.clientOrder.clientName}</span>
                    </div>

                    {/* Products List */}
                    <div className="space-y-1.5">
                      {supplier.clientOrder.products.map((product, idx) => (
                        <motion.div
                          key={idx}
                          className="bg-white rounded-md border border-gray-200 px-2.5 py-2 transition-all duration-200 cursor-pointer"
                          whileHover={{
                            scale: 1.02,
                            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                          }}
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-start gap-2">
                                  <Package className="w-3.5 h-3.5 text-[#555] mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[13px] text-[#555] leading-tight">{product.name}</div>
                                    <div className="text-xs text-[#777] mt-0.5">
                                      {product.quantity} {product.unit}
                                    </div>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Pedido asociado a {supplier.clientOrder.clientName}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Divider after client block */}
            {supplier.clientOrder && (
              <div className="mb-4 border-b border-[#E8E9E4]" />
            )}

            <div className="flex flex-wrap gap-2">
              <Badge className={statusConfig[supplier.status].className}>
                {statusConfig[supplier.status].label}
              </Badge>
              <Badge className={frequencyConfig[supplier.frequency].className}>
                {frequencyConfig[supplier.frequency].label}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicateOrder}>
                <Copy className="w-4 h-4 mr-2" />
                Repetir pedido
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Details Grid - Responsive 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="min-w-[100px] lg:min-w-[120px]">Recibe:</span>
            <span className="text-gray-900">{supplier.receiveDay}</span>
          </div>
          <div className="flex items-center">
            <span className="min-w-[100px] lg:min-w-[120px]">Método de pago:</span>
            <span className="text-gray-900">
              {supplier.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}
            </span>
          </div>
          <div className="flex items-center col-span-1 sm:col-span-2">
            <span className="min-w-[100px] lg:min-w-[120px]">Responsable:</span>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-6 h-6 rounded-full ${getAvatarColor(
                        supplier.responsible
                      )} flex items-center justify-center text-white text-[10px] cursor-pointer`}
                    >
                      {getInitials(supplier.responsible)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{supplier.responsible}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-gray-900">{supplier.responsible}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-5 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl border-gray-300 h-11"
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver pedido
          </Button>
          <Button
            onClick={onUpdateStatus}
            size="sm"
            className={`flex-1 rounded-xl transition-all h-11 ${
              supplier.status === "pendiente"
                ? "bg-[#2FB6A0] hover:bg-[#2FB6A0]/90 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            {supplier.status === "pendiente" ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Realizar
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Realizado
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Swipe Actions Background */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center gap-2 pr-3 lg:hidden">
        <Button
          onClick={() => {
            onEdit();
            setSwipeX(0);
          }}
          size="sm"
          className="h-12 w-12 p-0 rounded-xl bg-gray-600 hover:bg-gray-700 text-white shadow-md"
        >
          <Edit2 className="w-5 h-5" />
        </Button>
        <Button
          onClick={() => {
            onDuplicateOrder();
            setSwipeX(0);
          }}
          size="sm"
          className="h-12 w-12 p-0 rounded-xl bg-[#2FB6A0] hover:bg-[#2FB6A0]/90 text-white shadow-md"
        >
          <Copy className="w-5 h-5" />
        </Button>
        <Button
          onClick={() => {
            onDelete();
            setSwipeX(0);
          }}
          size="sm"
          className="h-12 w-12 p-0 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}