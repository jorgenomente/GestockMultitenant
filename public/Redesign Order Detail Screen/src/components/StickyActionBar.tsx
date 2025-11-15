import { Save, RotateCcw, FileDown, Copy } from 'lucide-react';
import { Button } from './ui/button';

interface StickyActionBarProps {
  totalUnits: number;
  total: number;
  onSave: () => void;
  onUndo: () => void;
  onExport: () => void;
  onCopyOrder: () => void;
}

export function StickyActionBar({
  totalUnits,
  total,
  onSave,
  onUndo,
  onExport,
  onCopyOrder,
}: StickyActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EAEAEA] shadow-lg z-40">
      <div className="max-w-[1400px] mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Totals */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-[#6B7280] mb-1">Total unidades</p>
              <p className="text-[#0E2E2B]">{totalUnits}</p>
            </div>
            <div className="h-8 w-px bg-[#EAEAEA]" />
            <div>
              <p className="text-xs text-[#6B7280] mb-1">Total a pagar</p>
              <p className="text-[#27AE60]">${total.toLocaleString('es-ES')}</p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              className="border-[#EAEAEA] text-[#6B7280] hover:text-[#0E2E2B] hover:bg-[#F3F4F6]"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Deshacer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCopyOrder}
              className="border-[#EAEAEA] text-[#0E2E2B] hover:bg-[#F3F4F6]"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar pedido
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="border-[#EAEAEA] text-[#0E2E2B] hover:bg-[#F3F4F6]"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              className="bg-[#27AE60] text-white hover:bg-[#229954]"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar pedido
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}