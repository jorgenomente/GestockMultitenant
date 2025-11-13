import { Users, Package, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import type { Supplier } from "../App";

interface ClientOrdersSummaryProps {
  suppliers: Supplier[];
}

export function ClientOrdersSummary({ suppliers }: ClientOrdersSummaryProps) {
  // Calculate metrics
  const clientsWithOrders = new Set(
    suppliers
      .filter((s) => s.clientOrder)
      .map((s) => s.clientOrder!.clientName)
  ).size;

  const totalProducts = suppliers.reduce((acc, s) => {
    if (s.clientOrder) {
      return acc + s.clientOrder.products.length;
    }
    return acc;
  }, 0);

  const syncedOrders = suppliers.filter((s) => s.clientOrder).length;

  const metrics = [
    {
      icon: Users,
      label: "Clientes con encargos activos",
      value: clientsWithOrders,
      color: "text-[#0E2E2B]",
      bgColor: "bg-[#0E2E2B]/10",
    },
    {
      icon: Package,
      label: "Productos solicitados",
      value: totalProducts,
      color: "text-[#2FB6A0]",
      bgColor: "bg-[#2FB6A0]/10",
    },
    {
      icon: RefreshCw,
      label: "Pedidos sincronizados con proveedores",
      value: syncedOrders,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-gradient-to-br from-gray-50 to-[#0E2E2B]/5 rounded-2xl p-4 lg:p-5 mb-4 lg:mb-6 border border-gray-200/50 shadow-sm"
    >
      <h4 className="text-sm text-gray-600 mb-3 lg:mb-4">
        Pedidos de clientes incluidos esta semana
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
              className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all"
            >
              <div
                className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl ${metric.bgColor} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${metric.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl lg:text-2xl text-gray-900 mb-0.5">{metric.value}</p>
                <p className="text-xs lg:text-sm text-gray-600 leading-tight">
                  {metric.label}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}