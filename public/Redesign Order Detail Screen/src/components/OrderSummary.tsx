import { Calculator, FolderTree, Plus, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';

interface OrderSummaryProps {
  totalQuantity: number;
  groupsCount: number;
  groups: string[];
  notes: string;
  onNotesChange: (value: string) => void;
  onClearNotes: () => void;
  autoSaved: boolean;
  onCreateGroup: () => void;
}

export function OrderSummary({
  totalQuantity,
  groupsCount,
  groups,
  notes,
  onNotesChange,
  onClearNotes,
  autoSaved,
  onCreateGroup,
}: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-[16px] p-6 shadow-sm">
      <h2 className="text-[#0E2E2B] mb-4">Resumen de pedido</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Line Items */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-[#F9FAF9] rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-[#E0F2F1] flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[#27AE60]" />
            </div>
            <div>
              <p className="text-sm text-[#6B7280]">Cantidad total</p>
              <p className="text-[#0E2E2B]">{totalQuantity} unidades</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-[#F9FAF9] rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-[#E0F2F1] flex items-center justify-center flex-shrink-0">
              <FolderTree className="w-5 h-5 text-[#27AE60]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#6B7280] mb-2">Grupos creados ({groupsCount})</p>
              <div className="flex flex-wrap gap-2">
                {groups.map((group, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-white border border-[#EAEAEA] text-[#0E2E2B]"
                  >
                    {group}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onCreateGroup}
            className="w-full border-dashed border-2 border-[#EAEAEA] text-[#27AE60] hover:bg-[#F0FDF4] hover:border-[#27AE60]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear grupo
          </Button>
        </div>

        {/* Quick Notes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[#0E2E2B]">Notas rápidas</label>
            {autoSaved && (
              <div className="flex items-center gap-1 text-[#27AE60] text-sm animate-in fade-in duration-300">
                <Check className="w-4 h-4" />
                <span>Guardado</span>
              </div>
            )}
          </div>
          
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Escribe notas sobre este pedido..."
            className="min-h-[140px] border-[#EAEAEA] focus:border-[#27AE60] focus:ring-[#27AE60] resize-none"
          />
          
          <Button
            variant="ghost"
            onClick={onClearNotes}
            className="w-full text-[#6B7280] hover:text-[#0E2E2B] hover:bg-[#F3F4F6]"
          >
            <X className="w-4 h-4 mr-2" />
            Limpiar notas
          </Button>
        </div>
      </div>
    </div>
  );
}
