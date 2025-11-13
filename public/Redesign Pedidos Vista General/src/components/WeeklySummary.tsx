import { Package, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { motion } from "motion/react";

interface WeeklySummaryProps {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  timelineData: Array<{
    day: string;
    date: string;
    total: number;
    completed: number;
    pending: number;
  }>;
  onDayClick: (day: string) => void;
}

export function WeeklySummary({
  total,
  completed,
  pending,
  overdue,
  timelineData,
  onDayClick,
}: WeeklySummaryProps) {
  const metrics = [
    {
      label: "Total de pedidos",
      value: total,
      icon: Package,
      color: "text-[#0E2E2B]",
      bgColor: "bg-gray-100",
    },
    {
      label: "Realizados",
      value: completed,
      icon: CheckCircle,
      color: "text-green-700",
      bgColor: "bg-green-50",
    },
    {
      label: "Pendientes",
      value: pending,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      label: "Fuera de fecha",
      value: overdue,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  const getDayStatus = (dayData: {
    total: number;
    completed: number;
    pending: number;
  }) => {
    if (dayData.total === 0) {
      return {
        color: "bg-gray-300",
        label: "Sin pedidos programados",
      };
    }
    if (dayData.completed === dayData.total) {
      return {
        color: "bg-green-500",
        label: "Todos realizados",
      };
    }
    if (dayData.pending > 0) {
      return {
        color: "bg-orange-500",
        label: "Hay pedidos pendientes",
      };
    }
    return {
      color: "bg-gray-300",
      label: "Sin pedidos",
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[#E8E9E4]/10 rounded-2xl p-4 lg:p-6 mb-4 lg:mb-6 border border-gray-200 shadow-sm"
    >
      <h3 className="text-sm text-gray-600 mb-3 lg:mb-4">Resumen semanal</h3>
      
      {/* KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl p-4 lg:p-5 border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2 lg:mb-3">
                <div
                  className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg ${metric.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${metric.color}`} />
                </div>
                <span className={`text-2xl lg:text-3xl ${metric.color}`}>{metric.value}</span>
              </div>
              <p className="text-xs lg:text-sm text-gray-600">{metric.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Mini Timeline - Desktop */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-600">Actividad semanal</h4>
        </div>
        <div className="flex items-center justify-between gap-2">
          {timelineData.map((dayData, index) => {
            const status = getDayStatus(dayData);
            return (
              <TooltipProvider key={dayData.day} delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      onClick={() => onDayClick(dayData.day)}
                      className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-white transition-all group flex-1"
                    >
                      <span className="text-xs text-gray-500 font-medium">
                        {dayData.day.slice(0, 3)}
                      </span>
                      <div className="relative">
                        <motion.div
                          whileHover={{ scale: 1.3 }}
                          whileTap={{ scale: 0.9 }}
                          className={`w-3 h-3 rounded-full ${status.color} shadow-sm cursor-pointer transition-all`}
                        />
                        {dayData.total > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0E2E2B] text-white rounded-full flex items-center justify-center text-[8px] font-semibold">
                            {dayData.total}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">{dayData.date}</span>
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border border-gray-200 shadow-lg">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="p-2"
                    >
                      <p className="font-semibold text-sm text-[#0E2E2B] mb-2">
                        {dayData.day} — {dayData.date}
                      </p>
                      {dayData.total > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600">
                            {dayData.total} pedido{dayData.total !== 1 ? "s" : ""}
                          </p>
                          {dayData.completed > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-xs text-gray-600">
                                {dayData.completed} realizado{dayData.completed !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                          {dayData.pending > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              <span className="text-xs text-gray-600">
                                {dayData.pending} pendiente{dayData.pending !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Sin pedidos programados</p>
                      )}
                    </motion.div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>

      {/* Mini Timeline - Mobile (Horizontal Scroll) */}
      <div className="lg:hidden">
        <h4 className="text-sm font-semibold text-gray-600 mb-3">Actividad semanal</h4>
        <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
          {timelineData.map((dayData, index) => {
            const status = getDayStatus(dayData);
            return (
              <motion.button
                key={dayData.day}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                onClick={() => onDayClick(dayData.day)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-gray-100 min-w-[70px] flex-shrink-0 active:scale-95 transition-transform"
              >
                <span className="text-xs text-gray-500 font-medium">{dayData.day.slice(0, 3)}</span>
                <div className="relative">
                  <div
                    className={`w-4 h-4 rounded-full ${status.color} shadow-sm transition-all`}
                  />
                  {dayData.total > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#0E2E2B] text-white rounded-full flex items-center justify-center text-[9px] font-semibold">
                      {dayData.total}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400">{dayData.date}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}