import { useState, useMemo } from "react";
import { Header } from "./components/Header";
import { WeekdaySection } from "./components/WeekdaySection";
import { SidePanel } from "./components/SidePanel";
import { WeeklySummary } from "./components/WeeklySummary";
import { ClientOrdersSummary } from "./components/ClientOrdersSummary";
import { FilterChips } from "./components/FilterChips";
import { HorizontalFilters } from "./components/HorizontalFilters";
import { ResponsiblePersonsPanel } from "./components/ResponsiblePersonsPanel";
import { NuevaSemanaModal } from "./components/modals/NuevaSemanaModal";
import { ProveedorModal } from "./components/modals/ProveedorModal";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner@2.0.3";
import { Maximize2, Minimize2, Plus, User } from "lucide-react";
import { Button } from "./components/ui/button";

export interface Supplier {
  id: string;
  name: string;
  status: "pendiente" | "realizado";
  frequency: "semanal" | "quincenal" | "mensual";
  orderDay: string;
  receiveDay: string;
  paymentMethod: "efectivo" | "transferencia";
  responsible: string;
  orderDate: string; // DD/MM/YYYY format
  // Client order information
  clientOrder?: {
    clientName: string;
    products: Array<{
      name: string;
      quantity: number;
      unit: string;
    }>;
  };
}

interface FilterChip {
  id: string;
  label: string;
  value: string;
}

const mockSuppliers: Record<string, Supplier[]> = {
  lunes: [
    {
      id: "1",
      name: "Abarrotes El Sol",
      status: "realizado",
      frequency: "semanal",
      orderDay: "Lunes",
      receiveDay: "Lunes",
      paymentMethod: "transferencia",
      responsible: "Jorge",
      orderDate: "04/11/2025",
      clientOrder: {
        clientName: "Restaurant El Buen Sabor",
        products: [
          { name: "Arroz blanco premium", quantity: 20, unit: "kg" },
          { name: "Aceite de girasol", quantity: 5, unit: "litros" },
        ],
      },
    },
    {
      id: "2",
      name: "Lácteos La Vaca",
      status: "pendiente",
      frequency: "semanal",
      orderDay: "Lunes",
      receiveDay: "Martes",
      paymentMethod: "efectivo",
      responsible: "María",
      orderDate: "04/11/2025",
      clientOrder: {
        clientName: "Cafetería Luna Nueva",
        products: [
          { name: "Leche entera", quantity: 30, unit: "litros" },
          { name: "Queso mozzarella", quantity: 3, unit: "kg" },
          { name: "Yogurt natural", quantity: 12, unit: "unidades" },
        ],
      },
    },
  ],
  martes: [
    {
      id: "3",
      name: "Frutas y Verduras del Campo",
      status: "pendiente",
      frequency: "quincenal",
      orderDay: "Martes",
      receiveDay: "Miércoles",
      paymentMethod: "transferencia",
      responsible: "Carlos",
      orderDate: "05/11/2025",
    },
  ],
  miercoles: [
    {
      id: "4",
      name: "Carnes Premium",
      status: "realizado",
      frequency: "semanal",
      orderDay: "Miércoles",
      receiveDay: "Miércoles",
      paymentMethod: "efectivo",
      responsible: "Jorge",
      orderDate: "06/11/2025",
      clientOrder: {
        clientName: "Parrillada Don José",
        products: [
          { name: "Carne de res premium", quantity: 15, unit: "kg" },
          { name: "Chorizo artesanal", quantity: 5, unit: "kg" },
        ],
      },
    },
  ],
  jueves: [],
  viernes: [
    {
      id: "5",
      name: "Bebidas del Norte",
      status: "pendiente",
      frequency: "mensual",
      orderDay: "Viernes",
      receiveDay: "Sábado",
      paymentMethod: "transferencia",
      responsible: "Ana",
      orderDate: "08/11/2025",
      clientOrder: {
        clientName: "Bar & Lounge Vista Mar",
        products: [
          { name: "Cerveza artesanal", quantity: 24, unit: "cajas" },
        ],
      },
    },
  ],
  sabado: [],
  domingo: [],
};

export default function App() {
  const [suppliers, setSuppliers] = useState(mockSuppliers);
  const [selectedWeek, setSelectedWeek] = useState("Semana del 3/11 al 9/11");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("todos");
  const [selectedResponsible, setSelectedResponsible] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isNewWeekModalOpen, setIsNewWeekModalOpen] = useState(false);
  const [isProveedorModalOpen, setIsProveedorModalOpen] = useState(false);
  const [isResponsiblePanelOpen, setIsResponsiblePanelOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [showOnlyClientOrders, setShowOnlyClientOrders] = useState(false);

  const weekdays = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  const weekdayLabels: Record<string, string> = {
    lunes: "Lunes",
    martes: "Martes",
    miercoles: "Miércoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sabado: "Sábado",
    domingo: "Domingo",
  };

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const allSuppliers = Object.values(suppliers).flat();
    return {
      total: allSuppliers.length,
      completed: allSuppliers.filter((s) => s.status === "realizado").length,
      pending: allSuppliers.filter((s) => s.status === "pendiente").length,
      overdue: 0, // Can be calculated based on dates
    };
  }, [suppliers]);

  // Get unique responsible persons
  const responsiblePersons = useMemo(() => {
    const allSuppliers = Object.values(suppliers).flat();
    const unique = Array.from(new Set(allSuppliers.map((s) => s.responsible)));
    return unique.sort();
  }, [suppliers]);

  // Build active filter chips
  const activeFilterChips = useMemo(() => {
    const chips: FilterChip[] = [];
    
    if (activeFilter !== "todos") {
      const label = activeFilter === "pendientes" 
        ? "Pendientes" 
        : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1);
      chips.push({ id: "filter", label, value: activeFilter });
    }
    
    if (selectedResponsible) {
      chips.push({ id: "responsible", label: `Responsable: ${selectedResponsible}`, value: selectedResponsible });
    }
    
    if (selectedDay) {
      chips.push({ id: "day", label: `Día: ${selectedDay}`, value: selectedDay });
    }
    
    if (showOnlyClientOrders) {
      chips.push({ id: "clientOrders", label: "Con cliente asociado", value: "clientOrders" });
    }
    
    return chips;
  }, [activeFilter, selectedResponsible, selectedDay, showOnlyClientOrders]);

  // Timeline data
  const timelineData = useMemo(() => {
    return weekdays.map((dayKey) => {
      const daySuppliers = suppliers[dayKey];
      return {
        day: weekdayLabels[dayKey],
        date: ["04/11", "05/11", "06/11", "07/11", "08/11", "09/11", "10/11"][weekdays.indexOf(dayKey)],
        total: daySuppliers.length,
        completed: daySuppliers.filter((s) => s.status === "realizado").length,
        pending: daySuppliers.filter((s) => s.status === "pendiente").length,
      };
    });
  }, [suppliers]);

  const filterSuppliers = (daySuppliers: Supplier[]) => {
    let filtered = daySuppliers;

    // Apply status/frequency filter
    if (activeFilter !== "todos") {
      if (activeFilter === "pendientes") {
        filtered = filtered.filter((s) => s.status === "pendiente");
      } else {
        filtered = filtered.filter((s) => s.frequency === activeFilter);
      }
    }

    // Apply responsible filter
    if (selectedResponsible) {
      filtered = filtered.filter((s) => s.responsible === selectedResponsible);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.responsible.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply client order filter
    if (showOnlyClientOrders) {
      filtered = filtered.filter((s) => !!s.clientOrder);
    }

    return filtered;
  };

  const handleDeleteSupplier = (dayKey: string, supplierId: string) => {
    setSuppliers((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey].filter((s) => s.id !== supplierId),
    }));
    toast.success("Proveedor eliminado");
  };

  const handleUpdateStatus = (dayKey: string, supplierId: string) => {
    const supplier = suppliers[dayKey].find((s) => s.id === supplierId);
    setSuppliers((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey].map((s) =>
        s.id === supplierId
          ? { ...s, status: s.status === "pendiente" ? "realizado" : "pendiente" }
          : s
      ),
    }));
    
    if (supplier?.status === "pendiente") {
      toast.success(`✅ Pedido realizado con éxito`, {
        description: `Fecha: ${supplier.orderDate}`,
      });
    } else {
      toast.info("Estado actualizado a pendiente");
    }
  };

  const handleDuplicateOrder = (supplier: Supplier) => {
    toast.success(`Pedido repetido: ${supplier.name}`, {
      description: "El pedido ha sido duplicado para la próxima semana",
    });
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsProveedorModalOpen(true);
  };

  const handleSaveSupplier = (supplier: Supplier) => {
    if (editingSupplier) {
      // Update existing supplier
      const oldDayKey = Object.keys(suppliers).find((key) =>
        suppliers[key].some((s) => s.id === editingSupplier.id)
      );
      if (oldDayKey) {
        const newDayKey = supplier.orderDay.toLowerCase();
        if (oldDayKey === newDayKey) {
          setSuppliers((prev) => ({
            ...prev,
            [oldDayKey]: prev[oldDayKey].map((s) => (s.id === supplier.id ? supplier : s)),
          }));
        } else {
          setSuppliers((prev) => ({
            ...prev,
            [oldDayKey]: prev[oldDayKey].filter((s) => s.id !== supplier.id),
            [newDayKey]: [...prev[newDayKey], supplier],
          }));
        }
      }
      toast.success("Proveedor actualizado");
    } else {
      // Add new supplier
      const dayKey = supplier.orderDay.toLowerCase();
      setSuppliers((prev) => ({
        ...prev,
        [dayKey]: [...prev[dayKey], { ...supplier, id: Date.now().toString() }],
      }));
      toast.success("Proveedor guardado");
    }
    setEditingSupplier(null);
  };

  const handleCreateWeek = (startDate: string, duplicateData: boolean) => {
    toast.success("Semana creada");
    setIsNewWeekModalOpen(false);
  };

  const handlePlanNextWeek = () => {
    toast.info("📆 Planificar próxima semana", {
      description: "Semana del 10/11 al 16/11 – Duplicando pedidos actuales",
    });
  };

  const handleRemoveFilterChip = (id: string) => {
    if (id === "filter") setActiveFilter("todos");
    if (id === "responsible") setSelectedResponsible(null);
    if (id === "day") setSelectedDay(null);
    if (id === "clientOrders") setShowOnlyClientOrders(false);
  };

  const handleClearAllFilters = () => {
    setActiveFilter("todos");
    setSelectedResponsible(null);
    setSelectedDay(null);
    setShowOnlyClientOrders(false);
  };

  const handleTimelineDayClick = (day: string) => {
    if (selectedDay === day) {
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
    }
  };

  // Filter days based on selected day from timeline
  const displayedWeekdays = selectedDay 
    ? weekdays.filter((dayKey) => weekdayLabels[dayKey] === selectedDay)
    : weekdays;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header
        selectedWeek={selectedWeek}
        onWeekChange={setSelectedWeek}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        responsiblePersons={responsiblePersons}
        selectedResponsible={selectedResponsible}
        onResponsibleChange={setSelectedResponsible}
        onNewWeek={() => setIsNewWeekModalOpen(true)}
        onPlanNextWeek={handlePlanNextWeek}
        onImport={() => toast.info("Función de importar en desarrollo")}
        onSaveCopy={() => toast.success("Copia guardada")}
        onRestore={() => toast.info("Función de restaurar en desarrollo")}
      />

      {/* Mobile Horizontal Filters */}
      <div className="lg:hidden fixed top-[140px] left-0 right-0 bg-white border-b border-gray-200 py-3 z-40">
        <HorizontalFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          responsiblePersons={responsiblePersons}
          selectedResponsible={selectedResponsible}
          onResponsibleChange={setSelectedResponsible}
        />
      </div>

      <div className="pt-[140px] lg:pt-[180px]">
        <main className={`px-4 lg:px-8 xl:px-16 py-6 lg:py-10 transition-all ${sidePanelOpen ? "lg:pr-[440px]" : ""}`}>
          <div className="max-w-[1600px] mx-auto">
            {/* Weekly Summary */}
            <WeeklySummary
              total={summaryMetrics.total}
              completed={summaryMetrics.completed}
              pending={summaryMetrics.pending}
              overdue={summaryMetrics.overdue}
              timelineData={timelineData}
              onDayClick={handleTimelineDayClick}
            />

            {/* Client Orders Summary */}
            <ClientOrdersSummary
              suppliers={Object.values(suppliers).flat()}
            />

            {/* Filter Chips */}
            <div className="hidden lg:block">
              <FilterChips
                filters={activeFilterChips}
                onRemove={handleRemoveFilterChip}
                onClearAll={handleClearAllFilters}
              />
            </div>

            {/* Client Filter Button */}
            <div className="hidden lg:flex items-center justify-end mb-4">
              <Button
                onClick={() => setShowOnlyClientOrders(!showOnlyClientOrders)}
                variant="outline"
                className={`rounded-xl border-gray-300 gap-2 transition-all ${
                  showOnlyClientOrders
                    ? "bg-[#0E2E2B] text-white border-[#0E2E2B] hover:bg-[#0E2E2B]/90 scale-105"
                    : "hover:bg-gray-50"
                }`}
              >
                <User className="w-4 h-4" />
                Con cliente asociado
              </Button>
            </div>

            {/* Compact/Expanded Toggle - Desktop only */}
            <div className="hidden lg:flex justify-end mb-4">
              <Button
                onClick={() => setIsCompactMode(!isCompactMode)}
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-300 gap-2"
              >
                {isCompactMode ? (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    Vista expandida
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    Vista compacta
                  </>
                )}
              </Button>
            </div>

            {/* Weekday Sections */}
            <div className="space-y-4 lg:space-y-6">
              {displayedWeekdays.map((dayKey) => {
                const daySuppliers = filterSuppliers(suppliers[dayKey]);
                const totalSuppliers = suppliers[dayKey].length;
                return (
                  <WeekdaySection
                    key={dayKey}
                    day={weekdayLabels[dayKey]}
                    suppliers={daySuppliers}
                    totalCount={totalSuppliers}
                    isCompactMode={isCompactMode}
                    onDeleteSupplier={(id) => handleDeleteSupplier(dayKey, id)}
                    onUpdateStatus={(id) => handleUpdateStatus(dayKey, id)}
                    onDuplicateOrder={(id) => {
                      const supplier = suppliers[dayKey].find((s) => s.id === id);
                      if (supplier) handleDuplicateOrder(supplier);
                    }}
                    onEditSupplier={handleEditSupplier}
                  />
                );
              })}
            </div>
          </div>
        </main>

        {/* Desktop Side Panel */}
        <div className="hidden lg:block">
          <SidePanel
            isOpen={sidePanelOpen}
            onToggle={() => setSidePanelOpen(!sidePanelOpen)}
            onAddSupplier={() => {
              setEditingSupplier(null);
              setIsProveedorModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* Mobile Floating Action Buttons */}
      <div className="lg:hidden fixed bottom-6 right-4 flex flex-col gap-3 z-50">
        <Button
          onClick={() => setIsResponsiblePanelOpen(true)}
          className="h-14 w-14 rounded-full bg-white border-2 border-gray-300 shadow-lg hover:shadow-xl transition-all p-0"
        >
          <User className="w-6 h-6 text-gray-700" />
        </Button>
        <Button
          onClick={() => setIsNewWeekModalOpen(true)}
          className="h-16 w-16 rounded-full bg-[#2FB6A0] hover:bg-[#2FB6A0]/90 shadow-lg hover:shadow-xl transition-all p-0"
        >
          <Plus className="w-7 h-7 text-white" />
        </Button>
      </div>

      {/* Responsible Persons Panel */}
      <ResponsiblePersonsPanel
        open={isResponsiblePanelOpen}
        onClose={() => setIsResponsiblePanelOpen(false)}
        suppliers={suppliers}
        onResponsibleSelect={(responsible) => {
          setSelectedResponsible(responsible);
          setIsResponsiblePanelOpen(false);
        }}
      />

      <NuevaSemanaModal
        open={isNewWeekModalOpen}
        onClose={() => setIsNewWeekModalOpen(false)}
        onCreateWeek={handleCreateWeek}
      />

      <ProveedorModal
        open={isProveedorModalOpen}
        onClose={() => {
          setIsProveedorModalOpen(false);
          setEditingSupplier(null);
        }}
        onSave={handleSaveSupplier}
        supplier={editingSupplier}
      />

      <Toaster position="bottom-center" className="lg:!bottom-right" />
    </div>
  );
}