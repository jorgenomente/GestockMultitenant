import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface DayStatus {
  day: string;
  date: string;
  total: number;
  completed: number;
  pending: number;
}

interface WeeklyTimelineProps {
  days: DayStatus[];
  selectedDay: string | null;
  onDayClick: (day: string) => void;
}

export function WeeklyTimeline({ days, selectedDay, onDayClick }: WeeklyTimelineProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      <aside
        className={`hidden lg:block fixed left-0 top-[220px] bottom-0 bg-white border-r border-gray-200 transition-all duration-300 shadow-sm z-40 ${
          isCollapsed ? "w-[60px]" : "w-[280px]"
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          {!isCollapsed && (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-[#0E2E2B]" />
                  <h3 className="text-[#0E2E2B]">Timeline semanal</h3>
                </div>
                <p className="text-xs text-gray-500">Vista rápida de pedidos por día</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto">
                {days.map((dayData, index) => {
                  const isSelected = selectedDay === dayData.day;
                  const hasOrders = dayData.total > 0;

                  return (
                    <button
                      key={dayData.day}
                      onClick={() => onDayClick(dayData.day)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-[#2FB6A0] bg-[#2FB6A0]/5"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm ${isSelected ? "text-[#0E2E2B]" : "text-gray-700"}`}>
                          {dayData.day}
                        </span>
                        <span className="text-xs text-gray-500">{dayData.date}</span>
                      </div>

                      {hasOrders ? (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {dayData.completed > 0 && (
                              <div
                                className="w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center"
                                title={`${dayData.completed} realizados`}
                              >
                                <span className="text-[10px] text-white">{dayData.completed}</span>
                              </div>
                            )}
                            {dayData.pending > 0 && (
                              <div
                                className="w-6 h-6 rounded-full bg-orange-500 border-2 border-white flex items-center justify-center"
                                title={`${dayData.pending} pendientes`}
                              >
                                <span className="text-[10px] text-white">{dayData.pending}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-600">{dayData.total} pedidos</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white"></div>
                          <span className="text-xs text-gray-400">Sin pedidos</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {isCollapsed && (
            <div className="flex flex-col items-center gap-4 py-4">
              {days.map((dayData) => {
                const isSelected = selectedDay === dayData.day;
                const hasOrders = dayData.total > 0;

                return (
                  <button
                    key={dayData.day}
                    onClick={() => onDayClick(dayData.day)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-[#2FB6A0] text-white"
                        : hasOrders
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        : "bg-gray-100 text-gray-400"
                    }`}
                    title={dayData.day}
                  >
                    <span className="text-xs">{dayData.day.slice(0, 1)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`fixed top-1/2 -translate-y-1/2 z-50 w-8 h-16 bg-[#0E2E2B] text-white rounded-r-lg flex items-center justify-center hover:bg-[#0E2E2B]/90 transition-all shadow-md ${
          isCollapsed ? "left-[60px]" : "left-[280px]"
        }`}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </>
  );
}