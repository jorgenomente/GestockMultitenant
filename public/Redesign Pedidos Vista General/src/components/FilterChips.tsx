import { X } from "lucide-react";
import { Button } from "./ui/button";

interface FilterChip {
  id: string;
  label: string;
  value: string;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <span className="text-sm text-gray-600">Filtros activos:</span>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <div
            key={filter.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E2E2B] text-white text-sm"
          >
            <span>{filter.label}</span>
            <button
              onClick={() => onRemove(filter.id)}
              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <Button
          onClick={onClearAll}
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-gray-600 hover:text-gray-900"
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
