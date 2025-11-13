import { User, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Input } from "./ui/input";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";
import type { Supplier } from "../App";

interface ResponsiblePersonsPanelProps {
  open: boolean;
  onClose: () => void;
  suppliers: Record<string, Supplier[]>;
  onResponsibleSelect: (responsible: string) => void;
}

export function ResponsiblePersonsPanel({
  open,
  onClose,
  suppliers,
  onResponsibleSelect,
}: ResponsiblePersonsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const responsibleStats = useMemo(() => {
    const allSuppliers = Object.values(suppliers).flat();
    const stats = new Map<string, { total: number; pending: number }>();

    allSuppliers.forEach((supplier) => {
      const current = stats.get(supplier.responsible) || { total: 0, pending: 0 };
      stats.set(supplier.responsible, {
        total: current.total + 1,
        pending: current.pending + (supplier.status === "pendiente" ? 1 : 0),
      });
    });

    return Array.from(stats.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers]);

  const filteredStats = useMemo(() => {
    if (!searchQuery) return responsibleStats;
    return responsibleStats.filter((stat) =>
      stat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [responsibleStats, searchQuery]);

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

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Responsables
          </SheetTitle>
          <SheetDescription>
            Selecciona un responsable para ver sus pedidos.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar responsable..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-gray-300"
            />
          </div>

          <div className="space-y-2">
            {filteredStats.map((stat) => (
              <button
                key={stat.name}
                onClick={() => {
                  onResponsibleSelect(stat.name);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div
                  className={`w-10 h-10 rounded-full ${getAvatarColor(
                    stat.name
                  )} flex items-center justify-center text-white flex-shrink-0`}
                >
                  {getInitials(stat.name)}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{stat.name}</p>
                  <p className="text-xs text-gray-500">
                    {stat.total} pedido{stat.total !== 1 ? "s" : ""}
                    {stat.pending > 0 && ` • ${stat.pending} pendiente${stat.pending !== 1 ? "s" : ""}`}
                  </p>
                </div>
                {stat.pending > 0 && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-medium">
                    {stat.pending}
                  </div>
                )}
              </button>
            ))}
          </div>

          {filteredStats.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No se encontraron responsables</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}