import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Product } from '../App';

interface ProductStatsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductStatsModal({ product, isOpen, onClose }: ProductStatsModalProps) {
  if (!product || !product.sales) return null;

  const { sales } = product;

  const periods = [
    { label: 'Últimos 7 días', value: sales.last7Days },
    { label: 'Promedio semanal', value: sales.weekAvg },
    { label: 'Últimos 15 días', value: sales.last15Days },
    { label: 'Últimos 30 días', value: sales.last30Days },
  ];

  // Prepare chart data - show only every 3rd day for cleaner display
  const chartData = sales.dailySales?.filter((_, index) => index % 3 === 0) || [];

  const currentDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-[#0E2E2B]">
            Estadísticas de ventas - {product.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#6B7280]">
            Análisis histórico de ventas del producto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Periods Table */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {periods.map((period, index) => (
              <div
                key={index}
                className="bg-[#F9FAF9] rounded-lg p-4 text-center border border-[#EAEAEA]"
              >
                <p className="text-xs text-[#6B7280] mb-2">{period.label}</p>
                <p className="text-[#0E2E2B]">{period.value} unidades</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-lg p-4 border border-[#EAEAEA]">
            <h3 className="text-sm text-[#6B7280] mb-4">Ventas últimos 30 días</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  stroke="#EAEAEA"
                />
                <YAxis 
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  stroke="#EAEAEA"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EAEAEA',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#0E2E2B' }}
                />
                <Line
                  type="monotone"
                  dataKey="units"
                  stroke="#27AE60"
                  strokeWidth={2}
                  dot={{ fill: '#27AE60', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Unidades"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-[#6B7280] pt-2 border-t border-[#EAEAEA]">
            <Calendar className="w-4 h-4" />
            <span>Actualizado el {currentDate}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
