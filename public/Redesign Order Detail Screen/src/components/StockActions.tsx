import { RefreshCw, Lightbulb, RotateCcw, Clock } from 'lucide-react';
import { Button } from './ui/button';

interface StockActionsProps {
  lastUpdate: string;
  onGetRealStock: () => void;
  onSuggested: () => void;
  onUndoChanges: () => void;
}

export function StockActions({
  lastUpdate,
  onGetRealStock,
  onSuggested,
  onUndoChanges,
}: StockActionsProps) {
  return (
    <div className="bg-white rounded-[16px] p-6 shadow-sm">
      <h2 className="text-[#0E2E2B] mb-4">Acciones de stock</h2>
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
        {/* Main Action */}
        <div className="flex-1 w-full">
          <Button
            onClick={onGetRealStock}
            className="w-full lg:w-auto bg-[#0E2E2B] hover:bg-[#1a4540] text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Obtener stock real
          </Button>
          
          <div className="flex items-center gap-2 mt-3 text-sm text-[#6B7280]">
            <Clock className="w-4 h-4" />
            <span>Actualizado el {lastUpdate}</span>
          </div>
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={onSuggested}
            className="border-[#EAEAEA] text-[#0E2E2B] hover:bg-[#F0FDF4] hover:border-[#27AE60]"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            Sugerido
          </Button>
          <Button
            variant="outline"
            onClick={onUndoChanges}
            className="border-[#EAEAEA] text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Deshacer cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
