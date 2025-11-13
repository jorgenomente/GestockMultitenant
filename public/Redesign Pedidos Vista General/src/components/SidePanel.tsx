import { useState } from "react";
import { Plus, ChevronRight, ChevronLeft, Search, Edit2, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { toast } from "sonner@2.0.3";

interface SidePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onAddSupplier: () => void;
}

type SupplierFrequency = "semanal" | "quincenal" | "mensual";
type SupplierStatus = "pendiente" | "añadido";

interface Supplier {
  id: string;
  name: string;
  frequency: SupplierFrequency;
  status: SupplierStatus;
  responsible: string;
}

const allSuppliers: Supplier[] = [
  { id: "1", name: "Distribuidora Central", frequency: "quincenal", status: "añadido", responsible: "Juan Pérez" },
  { id: "2", name: "Alimentos Selectos", frequency: "quincenal", status: "pendiente", responsible: "María García" },
  { id: "3", name: "Panadería Artesanal", frequency: "quincenal", status: "añadido", responsible: "Carlos López" },
  { id: "4", name: "Productos de Limpieza Pro", frequency: "quincenal", status: "pendiente", responsible: "Ana Martínez" },
  { id: "5", name: "Conservas del Valle", frequency: "mensual", status: "pendiente", responsible: "Pedro Sánchez" },
  { id: "6", name: "Especias y Condimentos", frequency: "mensual", status: "añadido", responsible: "Laura Torres" },
  { id: "7", name: "Aceites y Vinagres", frequency: "mensual", status: "pendiente", responsible: "Diego Ruiz" },
  { id: "8", name: "Lácteos Frescos", frequency: "semanal", status: "añadido", responsible: "Sofía Blanco" },
  { id: "9", name: "Carnicería Premium", frequency: "semanal", status: "añadido", responsible: "Roberto Cruz" },
  { id: "10", name: "Verduras Orgánicas", frequency: "semanal", status: "pendiente", responsible: "Carmen Vega" },
  { id: "11", name: "Bebidas y Refrescos", frequency: "quincenal", status: "pendiente", responsible: "Miguel Ángel" },
  { id: "12", name: "Productos Congelados", frequency: "mensual", status: "añadido", responsible: "Isabel Moreno" },
];

type TabValue = "todos" | "quincenales" | "mensuales";

export function SidePanel({ isOpen, onToggle, onAddSupplier }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("quincenales");
  const [searchQuery, setSearchQuery] = useState("");

  const handleAddSupplier = (supplier: Supplier) => {
    toast.success(`${supplier.name} añadido con éxito`, {
      description: `El proveedor ha sido agregado a la semana actual`,
    });
  };

  const handleEditSupplier = (supplier: Supplier) => {
    toast.info(`Editando ${supplier.name}`);
  };

  // Filter suppliers based on active tab
  const filterByTab = (suppliers: Supplier[]) => {
    if (activeTab === "todos") return suppliers;
    if (activeTab === "quincenales") return suppliers.filter(s => s.frequency === "quincenal");
    if (activeTab === "mensuales") return suppliers.filter(s => s.frequency === "mensual");
    return suppliers;
  };

  // Filter suppliers based on search query
  const filterBySearch = (suppliers: Supplier[]) => {
    if (!searchQuery.trim()) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(
      s => s.name.toLowerCase().includes(query) || s.responsible.toLowerCase().includes(query)
    );
  };

  const filteredSuppliers = filterBySearch(filterByTab(allSuppliers));
  const addedCount = filteredSuppliers.filter(s => s.status === "añadido").length;
  const totalCount = filteredSuppliers.length;

  const frequencyLabels: Record<SupplierFrequency, string> = {
    semanal: "Semanal",
    quincenal: "Quincenal",
    mensual: "Mensual",
  };

  const frequencyColors: Record<SupplierFrequency, string> = {
    semanal: "bg-blue-100 text-blue-700 border-blue-200",
    quincenal: "bg-purple-100 text-purple-700 border-purple-200",
    mensual: "bg-orange-100 text-orange-700 border-orange-200",
  };

  const tabs: { value: TabValue; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "quincenales", label: "Quincenales" },
    { value: "mensuales", label: "Mensuales" },
  ];

  return (
    <>
      <aside
        className={`fixed right-0 top-[220px] bottom-0 w-[420px] bg-white border-l border-gray-200 transition-transform duration-300 shadow-xl ${ 
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-8 h-full flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-[#0E2E2B] mb-2">Gestión de proveedores</h2>
            <p className="text-sm text-gray-500">
              Accedé rápidamente a los proveedores según su frecuencia.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm transition-all ${
                    activeTab === tab.value
                      ? "bg-[#0E2E2B] text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar proveedor o responsable"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl border-gray-300 focus:border-[#2FB6A0] focus:ring-[#2FB6A0]"
              />
            </div>
          </div>

          {/* Count Badge */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {totalCount} proveedor{totalCount !== 1 ? "es" : ""}
            </span>
            <Badge variant="outline" className="text-xs">
              {addedCount} / {totalCount} añadidos
            </Badge>
          </div>

          {/* Supplier List */}
          <div className="flex-1 overflow-y-auto -mx-2 px-2">
            {filteredSuppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-gray-900 mb-2">No se encontraron proveedores</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-xs">
                  {searchQuery
                    ? "Intentá con otros términos de búsqueda"
                    : "Comenzá agregando un nuevo proveedor"}
                </p>
                <Button
                  onClick={onAddSupplier}
                  className="bg-[#0E2E2B] hover:bg-[#0E2E2B]/90 text-white rounded-xl h-10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar proveedor
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {filteredSuppliers.map((supplier, index) => (
                  <div
                    key={supplier.id}
                    className={`p-4 rounded-xl border transition-all hover:shadow-sm ${
                      supplier.status === "añadido"
                        ? "bg-[#2FB6A0]/5 border-[#2FB6A0]/30"
                        : "bg-[#F8F9FA] border-gray-200 hover:border-gray-300"
                    }`}
                    style={{
                      animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm text-gray-900 mb-1 truncate">{supplier.name}</h4>
                        <p className="text-xs text-gray-500 truncate">{supplier.responsible}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        variant="outline"
                        className={`text-xs border ${frequencyColors[supplier.frequency]}`}
                      >
                        {frequencyLabels[supplier.frequency]}
                      </Badge>
                      {supplier.status === "añadido" ? (
                        <Badge className="text-xs bg-[#2FB6A0] text-white hover:bg-[#2FB6A0]">
                          Añadido
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-orange-200 bg-orange-50 text-orange-700">
                          Pendiente
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {supplier.status === "pendiente" ? (
                        <Button
                          onClick={() => handleAddSupplier(supplier)}
                          size="sm"
                          className="flex-1 h-8 text-xs bg-[#2FB6A0] hover:bg-[#2FB6A0]/90 text-white rounded-lg"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Agregar
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleEditSupplier(supplier)}
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs border-gray-300 rounded-lg"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-gray-200 space-y-3">
            <Button
              onClick={onAddSupplier}
              className="w-full bg-[#0E2E2B] hover:bg-[#0E2E2B]/90 text-white rounded-xl h-11"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar proveedor
            </Button>
            <button
              onClick={() => toast.info("Navegando al módulo de Proveedores")}
              className="w-full flex items-center justify-center gap-2 text-sm text-[#2FB6A0] hover:text-[#2FB6A0]/80 transition-colors py-2"
            >
              Ver todos los proveedores
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-50 w-10 h-20 bg-[#0E2E2B] text-white rounded-l-xl flex items-center justify-center hover:bg-[#0E2E2B]/90 transition-all shadow-lg ${ 
          isOpen ? "right-[420px]" : "right-0"
        }`}
      >
        {isOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
