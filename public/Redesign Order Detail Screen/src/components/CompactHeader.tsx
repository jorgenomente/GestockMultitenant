import { ArrowLeft, Package, FileText, Calendar, RefreshCw, Copy, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface CompactHeaderProps {
  supplier: string;
  status: 'Pendiente' | 'Realizado';
  date: string;
  dataSource: string;
  total: number;
  onBack: () => void;
  onUpdateStock: () => void;
  onDuplicate: () => void;
  onExport: () => void;
}

export function CompactHeader({
  supplier,
  status,
  date,
  dataSource,
  total,
  onBack,
  onUpdateStock,
  onDuplicate,
  onExport,
}: CompactHeaderProps) {
  const statusColor = status === 'Pendiente' 
    ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' 
    : 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]';

  return (
    <>
      {/* DESKTOP VERSION */}
      <div className="hidden md:block bg-white rounded-2xl p-6 shadow-sm border border-[#EAEAEA]">
        {/* Top Row - Back button & Actions */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-[#6B7280] hover:text-[#0E2E2B] hover:bg-[#F3F4F6] -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onUpdateStock}
              className="border-[#EAEAEA] text-[#0E2E2B] hover:bg-[#E0F2F1] hover:border-[#27AE60]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar stock
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDuplicate}
              className="border-[#EAEAEA] text-[#0E2E2B] hover:bg-[#F3F4F6]"
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="border-[#EAEAEA] text-[#0E2E2B] hover:bg-[#F3F4F6]"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Main Info Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-[#0E2E2B] mb-3">{supplier}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Package className="w-4 h-4" />
                <Badge className={`${statusColor} border`}>
                  {status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Calendar className="w-4 h-4" />
                <span>{date}</span>
              </div>
              <div className="flex items-center gap-2 text-[#6B7280]">
                <FileText className="w-4 h-4" />
                <span>{dataSource}</span>
              </div>
            </div>
          </div>

          <div className="lg:text-right">
            <p className="text-sm text-[#6B7280] mb-1">Total del pedido</p>
            <p className="text-[#0E2E2B]">${total.toLocaleString('es-ES')}</p>
          </div>
        </div>
      </div>

      {/* MOBILE VERSION - Versión Final Compacta (1 columna) */}
      <div className="block md:hidden w-full bg-white rounded-xl shadow-sm border border-[#EAEAEA] overflow-visible">
        {/* Auto-layout vertical - Padding total 12px */}
        <div className="flex flex-col gap-1 px-3 py-3">
          
          {/* FILA SUPERIOR - Volver | Nombre | Actualizar stock */}
          <div className="flex items-center gap-2 w-full min-h-[32px]">
            {/* Icono Volver */}
            <button
              onClick={onBack}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#0E2E2B] hover:bg-[#F3F4F6] rounded-lg transition-colors -ml-1"
              aria-label="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Nombre del proveedor - flexible, puede crecer */}
            <h1 className="flex-1 text-[#0E2E2B] text-sm font-semibold leading-tight min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              {supplier}
            </h1>

            {/* Botón Actualizar stock - compacto */}
            <Button
              onClick={onUpdateStock}
              size="sm"
              className="flex-shrink-0 h-8 px-2.5 bg-[#27AE60] text-white hover:bg-[#229954] text-xs font-medium shadow-none"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span className="hidden xs:inline">Actualizar</span>
              <span className="inline xs:hidden">Stock</span>
            </Button>
          </div>

          {/* FILA DE METADATA - Estado | Fecha | Archivo (horizontal muy compacta) */}
          <div className="flex items-center gap-2 flex-wrap w-full min-h-[24px]">
            {/* Estado */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Package className="w-4 h-4 text-[#6B7280]" />
              <Badge className={`${statusColor} border text-xs h-5 px-1.5 leading-none`}>
                {status}
              </Badge>
            </div>

            {/* Separador */}
            <div className="w-px h-3 bg-[#E5E7EB] flex-shrink-0" />

            {/* Fecha */}
            <div className="flex items-center gap-1 text-xs text-[#6B7280] flex-shrink-0">
              <Calendar className="w-4 h-4" />
              <span className="whitespace-nowrap">{date}</span>
            </div>

            {/* Separador */}
            <div className="w-px h-3 bg-[#E5E7EB] flex-shrink-0" />

            {/* Archivo - puede truncar si es muy largo */}
            <div className="flex items-center gap-1 text-xs text-[#6B7280] min-w-0 flex-1">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="truncate" title={dataSource}>
                {dataSource}
              </span>
            </div>
          </div>

          {/* FILA INFERIOR - Total del pedido (alineado a la derecha) */}
          <div className="flex items-center justify-end w-full min-h-[20px] pt-0.5">
            <div className="text-right">
              <span className="text-[10px] text-[#9CA3AF] leading-none">Total del pedido: </span>
              <span className="text-sm text-[#0E2E2B] font-semibold leading-none">
                ${total.toLocaleString('es-ES')}
              </span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
