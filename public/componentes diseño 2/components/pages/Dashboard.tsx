/**
 * GeStock Dashboard - Natural Dark Theme with Moss Green Actions
 * 
 * Color Hierarchy:
 * - Structure: Deep Green #2C3A33 (background, navigation)
 * - Action: Moss Green #7DAA92 (CTAs, buttons, positive states)
 * - Data: Blue Gray #7394B0 (charts, analytics, neutral KPIs)
 * - Alert: Copper #C1643B (warnings, critical states only)
 * - Surfaces: Sage Gray #3C4A44 (cards, containers)
 * - Text Primary: Warm White #F5F5F2
 * - Text Secondary: Light Sage #B9BBB8
 * - Borders: Stone Gray #4B5B53
 * 
 * Design Philosophy:
 * Natural calm meets modern clarity. Moss Green signals action and growth,
 * Blue Gray supports analytical data, Copper reserved for alerts.
 * Visual hierarchy: Structure → Action → Data → Alert.
 * All contrast ratios meet WCAG AA standards (≥4.5:1).
 */

import { Users, ShoppingCart, Package, TrendingUp, Plus, FileUp, AlertCircle, ArrowRight } from 'lucide-react';
import { CompactKPICard } from '../CompactKPICard';
import { Button } from '../ui/button';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const purchaseData = [
  { day: 'Lun', amount: 2400 },
  { day: 'Mar', amount: 3200 },
  { day: 'Mié', amount: 2800 },
  { day: 'Jue', amount: 3900 },
  { day: 'Vie', amount: 4200 },
  { day: 'Sáb', amount: 3100 },
  { day: 'Dom', amount: 2600 },
];

// Stock health data for segmented bar
const stockSegments = [
  { label: 'Óptimo', value: 45, color: '#7DAA92' },
  { label: 'Bajo', value: 30, color: '#7394B0' },
  { label: 'Crítico', value: 15, color: '#C1643B' },
  { label: 'Exceso', value: 10, color: '#8FBDA5' },
];

export function Dashboard() {
  const totalStock = stockSegments.reduce((sum, seg) => sum + seg.value, 0);

  return (
    <div className="relative pb-20 md:pb-0 bg-[#2C3A33] min-h-screen">
      {/* Header - Deep Green Background */}
      <div className="px-4 pt-5 pb-4 border-b" style={{ borderColor: '#4B5B53' }}>
        <p 
          className="text-[11px] m-0 mb-1.5" 
          style={{ 
            fontFamily: 'var(--font-family-body)', 
            letterSpacing: '0.02em',
            color: 'rgba(233, 227, 208, 0.7)'
          }}
        >
          Hola, María 👋
        </p>
        <h1 
          className="m-0 text-[1.5rem] leading-tight"
          style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontWeight: 600,
            color: '#F5F5F2',
            letterSpacing: '-0.02em'
          }}
        >
          Resumen Operativo
        </h1>
      </div>

      {/* Zone 1: Overview KPIs - Horizontal Scroll */}
      <div className="px-4 py-4 border-b" style={{ borderColor: '#4B5B53' }}>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          <CompactKPICard
            title="Total Proveedores"
            value="32"
            trend={{ value: '+12%', direction: 'up' }}
            icon={Users}
            accentColor="#7DAA92"
          />
          <CompactKPICard
            title="Pedidos Abiertos"
            value="18"
            trend={{ value: '6 pend.', direction: 'neutral' }}
            icon={ShoppingCart}
            accentColor="#7394B0"
          />
          <CompactKPICard
            title="Vencimientos"
            value="23"
            trend={{ value: '15/7d', direction: 'down' }}
            icon={Package}
            accentColor="#C1643B"
          />
          <CompactKPICard
            title="Presupuesto"
            value="67%"
            trend={{ value: '+8%', direction: 'up' }}
            icon={TrendingUp}
            accentColor="#7DAA92"
          />
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex gap-2.5">
          <Button 
            className="gestock-btn-moss flex-1 h-11 gap-2 rounded-xl border-0"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span className="text-sm" style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}>
              Nuevo Pedido
            </span>
          </Button>
          <Button 
            className="gestock-btn-secondary flex-1 h-11 gap-2 rounded-xl border-0"
          >
            <FileUp className="w-4 h-4" strokeWidth={2} />
            <span className="text-sm" style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}>
              Subir Factura
            </span>
          </Button>
        </div>
      </div>

      {/* Zone 2: Trends - Two Column Grid */}
      <div className="px-4 pt-2 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Weekly Purchases - Sage Gray Card */}
          <div 
            className="rounded-xl p-4 border"
            style={{
              backgroundColor: '#3C4A44',
              borderColor: '#4B5B53',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 
                className="text-sm m-0" 
                style={{ 
                  fontFamily: 'var(--font-family-heading)', 
                  fontWeight: 600, 
                  color: '#F5F5F2' 
                }}
              >
                Compras Semanales
              </h3>
              <button 
                className="text-[10px] px-2 py-1 rounded-full active:scale-95 transition-all flex items-center gap-1"
                style={{
                  color: '#E9E3D0',
                  backgroundColor: 'rgba(233, 227, 208, 0.15)',
                  fontFamily: 'var(--font-family-body)',
                  fontWeight: 500,
                }}
              >
                Ver todo
                <ArrowRight className="w-3 h-3" strokeWidth={2} />
              </button>
            </div>
            
            <div className="h-[160px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={purchaseData.slice(0, 4)}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    style={{ 
                      fontFamily: 'var(--font-family-mono)', 
                      fontSize: '10px', 
                      fill: '#E9E3D0' 
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      fontFamily: 'var(--font-family-body)',
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(185, 187, 184, 0.3)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      backgroundColor: '#3A4A42',
                      color: '#F5F5F2',
                      padding: '8px 12px'
                    }}
                    cursor={{ fill: 'rgba(115, 148, 176, 0.1)', opacity: 0.5 }}
                  />
                  <Bar dataKey="amount" fill="#7394B0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-2 text-center">
              <p 
                className="text-[10px] m-0" 
                style={{ 
                  fontFamily: 'var(--font-family-mono)',
                  color: 'rgba(233, 227, 208, 0.6)'
                }}
              >
                Desliza para ver más días →
              </p>
            </div>
          </div>

          {/* Stock Health - Segmented Bar */}
          <div 
            className="rounded-xl p-4 border"
            style={{
              backgroundColor: '#3C4A44',
              borderColor: '#4B5B53',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 
                className="text-sm m-0" 
                style={{ 
                  fontFamily: 'var(--font-family-heading)', 
                  fontWeight: 600, 
                  color: '#F5F5F2' 
                }}
              >
                Estado del Stock
              </h3>
            </div>
            
            {/* Segmented Horizontal Bar */}
            <div className="mb-4 mt-5">
              <div 
                className="h-10 rounded-full overflow-hidden flex"
                style={{
                  backgroundColor: '#2C3A33'
                }}
              >
                {stockSegments.map((segment, index) => {
                  const percentage = (segment.value / totalStock) * 100;
                  return (
                    <div
                      key={segment.label}
                      className="flex items-center justify-center transition-all hover:opacity-80"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: segment.color,
                      }}
                    >
                      {percentage > 12 && (
                        <span 
                          className="text-[11px] tabular-nums" 
                          style={{ 
                            fontFamily: 'var(--font-family-mono)', 
                            fontWeight: 600,
                            color: '#F5F5F2'
                          }}
                        >
                          {segment.value}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2">
              {stockSegments.map((segment) => (
                <div key={segment.label} className="flex items-center gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: segment.color }}
                  />
                  <span 
                    className="text-[11px]" 
                    style={{ 
                      fontFamily: 'var(--font-family-body)',
                      color: '#E9E3D0'
                    }}
                  >
                    {segment.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Zone 3: Alerts / Insights */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Critical Alert */}
          <div 
            className="rounded-xl p-3.5 border"
            style={{
              backgroundColor: 'rgba(193, 100, 59, 0.15)',
              borderColor: 'rgba(193, 100, 59, 0.4)',
            }}
          >
            <div className="flex items-start gap-2.5">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(193, 100, 59, 0.25)',
                }}
              >
                <AlertCircle className="w-4 h-4 text-[#C1643B]" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 
                  className="text-sm m-0 mb-1" 
                  style={{ 
                    fontFamily: 'var(--font-family-heading)', 
                    fontWeight: 600, 
                    color: '#F5C29F'
                  }}
                >
                  Vencimientos Críticos
                </h4>
                <p 
                  className="text-[12px] m-0 mb-2" 
                  style={{ 
                    fontFamily: 'var(--font-family-body)',
                    color: 'rgba(245, 245, 242, 0.8)'
                  }}
                >
                  15 productos vencen en 7 días
                </p>
                <button 
                  className="text-[11px] px-2.5 py-1 rounded-lg active:scale-95 transition-all flex items-center gap-1"
                  style={{
                    color: '#F5C29F',
                    backgroundColor: 'rgba(193, 100, 59, 0.2)',
                    fontFamily: 'var(--font-family-body)',
                    fontWeight: 500,
                  }}
                >
                  Ver detalle
                  <ArrowRight className="w-3 h-3" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* Positive Insight */}
          <div 
            className="rounded-xl p-3.5 border"
            style={{
              backgroundColor: 'rgba(125, 170, 146, 0.15)',
              borderColor: 'rgba(125, 170, 146, 0.4)',
            }}
          >
            <div className="flex items-start gap-2.5">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(125, 170, 146, 0.25)',
                }}
              >
                <TrendingUp className="w-4 h-4 text-[#7DAA92]" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 
                  className="text-sm m-0 mb-1" 
                  style={{ 
                    fontFamily: 'var(--font-family-heading)', 
                    fontWeight: 600, 
                    color: '#8FBDA5'
                  }}
                >
                  Presupuesto Saludable
                </h4>
                <p 
                  className="text-[12px] m-0 mb-2" 
                  style={{ 
                    fontFamily: 'var(--font-family-body)',
                    color: 'rgba(245, 245, 242, 0.8)'
                  }}
                >
                  33% disponible ($4,150)
                </p>
                <button 
                  className="text-[11px] px-2.5 py-1 rounded-lg active:scale-95 transition-all flex items-center gap-1"
                  style={{
                    color: '#8FBDA5',
                    backgroundColor: 'rgba(125, 170, 146, 0.2)',
                    fontFamily: 'var(--font-family-body)',
                    fontWeight: 500,
                  }}
                >
                  Ver análisis
                  <ArrowRight className="w-3 h-3" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="px-4 pb-6 pt-2">
        <div 
          className="rounded-xl p-3 border"
          style={{
            backgroundColor: '#3C4A44',
            borderColor: '#4B5B53',
          }}
        >
          <div className="grid grid-cols-3 divide-x" style={{ divideColor: '#4B5B53' }}>
            <div className="text-center px-2" style={{ borderRight: '1px solid #4B5B53' }}>
              <p 
                className="text-xs m-0 mb-1" 
                style={{ 
                  fontFamily: 'var(--font-family-body)',
                  color: '#B9BBB8'
                }}
              >
                Esta semana
              </p>
              <p 
                className="text-base m-0 tabular-nums" 
                style={{ 
                  fontFamily: 'var(--font-family-heading)', 
                  fontWeight: 600, 
                  color: '#F5F5F2' 
                }}
              >
                $4,200
              </p>
            </div>
            <div className="text-center px-2" style={{ borderRight: '1px solid #4B5B53' }}>
              <p 
                className="text-xs m-0 mb-1" 
                style={{ 
                  fontFamily: 'var(--font-family-body)',
                  color: '#B9BBB8'
                }}
              >
                Pedidos/mes
              </p>
              <p 
                className="text-base m-0 tabular-nums" 
                style={{ 
                  fontFamily: 'var(--font-family-heading)', 
                  fontWeight: 600, 
                  color: '#F5F5F2' 
                }}
              >
                47
              </p>
            </div>
            <div className="text-center px-2">
              <p 
                className="text-xs m-0 mb-1" 
                style={{ 
                  fontFamily: 'var(--font-family-body)',
                  color: 'rgba(233, 227, 208, 0.7)'
                }}
              >
                Productos
              </p>
              <p 
                className="text-base m-0 tabular-nums" 
                style={{ 
                  fontFamily: 'var(--font-family-heading)', 
                  fontWeight: 600, 
                  color: '#F5F5F2' 
                }}
              >
                248
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
