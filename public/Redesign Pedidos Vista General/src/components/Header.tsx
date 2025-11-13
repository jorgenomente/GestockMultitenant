import { Search, Plus, Upload, Copy, RotateCcw, CalendarPlus, User, Menu, X, ChevronDown, Download, FileDown, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "./ui/sheet";

interface HeaderProps {
  selectedWeek: string;
  onWeekChange: (week: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  responsiblePersons: string[];
  selectedResponsible: string | null;
  onResponsibleChange: (responsible: string | null) => void;
  onNewWeek: () => void;
  onPlanNextWeek: () => void;
  onImport: () => void;
  onSaveCopy: () => void;
  onRestore: () => void;
}

export function Header({
  selectedWeek,
  onWeekChange,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  responsiblePersons,
  selectedResponsible,
  onResponsibleChange,
  onNewWeek,
  onPlanNextWeek,
  onImport,
  onSaveCopy,
  onRestore,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filters = [
    { value: "todos", label: "Todos" },
    { value: "pendientes", label: "Pendientes" },
    { value: "semanal", label: "Semanal" },
    { value: "quincenal", label: "Quincenal" },
    { value: "mensual", label: "Mensual" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 shadow-sm">
      {/* Mobile Header */}
      <div className="lg:hidden px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0E2E2B] flex items-center justify-center shadow-md">
              <span className="text-white font-bold">GS</span>
            </div>
            <div>
              <h1 className="text-lg text-[#0E2E2B]">Pedidos</h1>
            </div>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle>Menú</SheetTitle>
                <SheetDescription>
                  Acciones rápidas y opciones de gestión
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 mt-6">
                <Button
                  onClick={() => {
                    onNewWeek();
                    setMobileMenuOpen(false);
                  }}
                  className="bg-[#2FB6A0] hover:bg-[#2FB6A0]/90 text-white rounded-xl justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva semana
                </Button>
                <Button
                  onClick={() => {
                    onPlanNextWeek();
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="border-[#2FB6A0] text-[#2FB6A0] rounded-xl justify-start"
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Planificar próxima semana
                </Button>
                <Button
                  onClick={() => {
                    onImport();
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="rounded-xl justify-start"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </Button>
                <Button
                  onClick={() => {
                    onSaveCopy();
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="rounded-xl justify-start"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Guardar copia
                </Button>
                <Button
                  onClick={() => {
                    onRestore();
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="rounded-xl justify-start"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Select value={selectedWeek} onValueChange={onWeekChange}>
          <SelectTrigger className="w-full border-gray-300 rounded-xl h-11 mb-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semana del 3/11 al 9/11">Semana del 3/11 al 9/11</SelectItem>
            <SelectItem value="Semana del 10/11 al 16/11">Semana del 10/11 al 16/11</SelectItem>
            <SelectItem value="Semana del 17/11 al 23/11">Semana del 17/11 al 23/11</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar proveedor o responsable"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 rounded-xl border-gray-300"
          />
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block px-8 py-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#0E2E2B] flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xl">GS</span>
              </div>
              <div>
                <h1 className="text-[#0E2E2B] tracking-tight">Pedidos / Vista general</h1>
              </div>
            </div>

            <Select value={selectedWeek} onValueChange={onWeekChange}>
              <SelectTrigger className="w-[260px] border-gray-300 rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semana del 3/11 al 9/11">Semana del 3/11 al 9/11</SelectItem>
                <SelectItem value="Semana del 10/11 al 16/11">Semana del 10/11 al 16/11</SelectItem>
                <SelectItem value="Semana del 17/11 al 23/11">Semana del 17/11 al 23/11</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={onNewWeek}
              className="bg-[#2FB6A0] hover:bg-[#2FB6A0]/90 text-white rounded-xl px-5 h-11 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva semana
            </Button>
            <Button
              onClick={onPlanNextWeek}
              variant="outline"
              className="border-[#2FB6A0] text-[#2FB6A0] hover:bg-[#2FB6A0]/10 rounded-xl px-5 h-11"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              Planificar próxima semana
            </Button>
            <Button
              onClick={onImport}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-5 h-11"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button
              onClick={onSaveCopy}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-5 h-11"
            >
              <Copy className="w-4 h-4 mr-2" />
              Guardar copia
            </Button>
            <Button
              onClick={onRestore}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-5 h-11"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar proveedor o responsable"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-11 h-11 rounded-xl border-gray-300 focus:border-[#2FB6A0] focus:ring-[#2FB6A0]"
            />
          </div>

          <div className="flex items-center gap-3 ml-8">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => onFilterChange(filter.value)}
                className={`px-5 py-2.5 rounded-xl transition-all ${
                  activeFilter === filter.value
                    ? "bg-[#0E2E2B] text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                {filter.label}
              </button>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
                    selectedResponsible
                      ? "bg-[#0E2E2B] text-white shadow-md"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
                  }`}
                >
                  <User className="w-4 h-4" />
                  {selectedResponsible || "Responsable"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {selectedResponsible && (
                  <>
                    <DropdownMenuItem onClick={() => onResponsibleChange(null)}>
                      <span className="text-gray-500">Ver todos</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {responsiblePersons.map((person) => (
                  <DropdownMenuItem
                    key={person}
                    onClick={() => onResponsibleChange(person)}
                    className={selectedResponsible === person ? "bg-gray-100" : ""}
                  >
                    {person}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}