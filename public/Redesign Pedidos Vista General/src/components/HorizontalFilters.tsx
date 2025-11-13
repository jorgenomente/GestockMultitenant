import { User, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "./ui/sheet";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { useState } from "react";

interface HorizontalFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  responsiblePersons: string[];
  selectedResponsible: string | null;
  onResponsibleChange: (responsible: string | null) => void;
}

export function HorizontalFilters({
  activeFilter,
  onFilterChange,
  responsiblePersons,
  selectedResponsible,
  onResponsibleChange,
}: HorizontalFiltersProps) {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState(activeFilter);
  const [tempResponsible, setTempResponsible] = useState(selectedResponsible);

  const filters = [
    { value: "todos", label: "Todos" },
    { value: "pendientes", label: "Pendientes" },
    { value: "semanal", label: "Semanal" },
    { value: "quincenal", label: "Quincenal" },
    { value: "mensual", label: "Mensual" },
  ];

  const applyFilters = () => {
    onFilterChange(tempFilter);
    onResponsibleChange(tempResponsible);
    setIsFilterSheetOpen(false);
  };

  const resetFilters = () => {
    setTempFilter("todos");
    setTempResponsible(null);
  };

  return (
    <div className="lg:hidden">
      {/* Horizontal Scrollable Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 px-4 no-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm transition-all flex-shrink-0 ${
              activeFilter === filter.value
                ? "bg-[#0E2E2B] text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-300"
            }`}
          >
            {filter.label}
          </button>
        ))}

        {/* Responsible Filter Button */}
        <button
          onClick={() => {
            setTempFilter(activeFilter);
            setTempResponsible(selectedResponsible);
            setIsFilterSheetOpen(true);
          }}
          className={`px-4 py-2 rounded-full whitespace-nowrap text-sm transition-all flex-shrink-0 flex items-center gap-2 ${
            selectedResponsible
              ? "bg-[#0E2E2B] text-white shadow-md"
              : "bg-white text-gray-600 border border-gray-300"
          }`}
        >
          <User className="w-4 h-4" />
          {selectedResponsible || "Responsable"}
        </button>

        {/* More Filters Button */}
        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetTrigger asChild>
            <button
              className="px-4 py-2 rounded-full whitespace-nowrap text-sm transition-all flex-shrink-0 flex items-center gap-2 bg-white text-gray-600 border border-gray-300"
              onClick={() => {
                setTempFilter(activeFilter);
                setTempResponsible(selectedResponsible);
              }}
            >
              <Filter className="w-4 h-4" />
              Más filtros
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Filtros avanzados</SheetTitle>
              <SheetDescription>Aplica filtros para personalizar tus resultados.</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              {/* Frequency Filter */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Frecuencia</h3>
                <div className="space-y-3">
                  {filters.map((filter) => (
                    <div key={filter.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={filter.value}
                        checked={tempFilter === filter.value}
                        onCheckedChange={(checked) => {
                          if (checked) setTempFilter(filter.value);
                        }}
                      />
                      <Label
                        htmlFor={filter.value}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {filter.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Responsible Filter */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Responsable</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-responsible"
                      checked={tempResponsible === null}
                      onCheckedChange={(checked) => {
                        if (checked) setTempResponsible(null);
                      }}
                    />
                    <Label htmlFor="all-responsible" className="text-sm font-normal cursor-pointer">
                      Todos
                    </Label>
                  </div>
                  {responsiblePersons.map((person) => (
                    <div key={person} className="flex items-center space-x-2">
                      <Checkbox
                        id={`responsible-${person}`}
                        checked={tempResponsible === person}
                        onCheckedChange={(checked) => {
                          if (checked) setTempResponsible(person);
                        }}
                      />
                      <Label
                        htmlFor={`responsible-${person}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {person}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex gap-3">
              <Button
                onClick={resetFilters}
                variant="outline"
                className="flex-1 rounded-xl border-gray-300"
              >
                Limpiar
              </Button>
              <Button
                onClick={applyFilters}
                className="flex-1 rounded-xl bg-[#2FB6A0] hover:bg-[#2FB6A0]/90"
              >
                Aplicar filtros
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}