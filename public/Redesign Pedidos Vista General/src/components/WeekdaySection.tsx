import { Calendar } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { SupplierCard } from "./SupplierCard";
import type { Supplier } from "../App";

interface WeekdaySectionProps {
  day: string;
  suppliers: Supplier[];
  totalCount: number;
  isCompactMode?: boolean;
  onDeleteSupplier: (id: string) => void;
  onUpdateStatus: (id: string) => void;
  onDuplicateOrder: (id: string) => void;
  onEditSupplier: (supplier: Supplier) => void;
}

export function WeekdaySection({
  day,
  suppliers,
  totalCount,
  isCompactMode = false,
  onDeleteSupplier,
  onUpdateStatus,
  onDuplicateOrder,
  onEditSupplier,
}: WeekdaySectionProps) {
  const pendingCount = suppliers.filter((s) => s.status === "pendiente").length;

  return (
    <Accordion type="single" collapsible defaultValue={suppliers.length > 0 ? "item-1" : undefined}>
      <AccordionItem value="item-1" className="border border-gray-200 rounded-xl lg:rounded-2xl bg-white shadow-sm">
        <AccordionTrigger className="px-4 lg:px-8 py-4 lg:py-5 hover:no-underline">
          <div className="flex items-center justify-between w-full pr-2 lg:pr-4">
            <div className="flex items-center gap-2 lg:gap-4">
              <h2 className="text-[#0E2E2B] text-lg lg:text-xl">{day}</h2>
              {totalCount > 0 && (
                <div className="flex items-center gap-2 lg:gap-3">
                  <span className="px-3 lg:px-4 py-1 lg:py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs lg:text-sm">
                    {suppliers.length} de {totalCount}
                  </span>
                  {pendingCount > 0 && (
                    <span className="px-3 lg:px-4 py-1 lg:py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs lg:text-sm">
                      {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 lg:px-8 pb-4 lg:pb-8">
          {suppliers.length === 0 ? (
            <div className="text-center py-12 lg:py-16 px-4 lg:px-8 rounded-xl bg-gray-50/50 border border-gray-100">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-gray-200/50 flex items-center justify-center">
                  <Calendar className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm lg:text-base text-gray-500 mb-1">Sin pedidos programados para este día</p>
                  <p className="text-xs lg:text-sm text-gray-400">
                    {totalCount > 0
                      ? "Los pedidos de este día no coinciden con los filtros activos"
                      : "Agregá proveedores para comenzar"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5 pt-4 lg:pt-6">
              {suppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  isCompactMode={isCompactMode}
                  onDelete={() => onDeleteSupplier(supplier.id)}
                  onUpdateStatus={() => onUpdateStatus(supplier.id)}
                  onDuplicateOrder={() => onDuplicateOrder(supplier.id)}
                  onEdit={() => onEditSupplier(supplier)}
                />
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}