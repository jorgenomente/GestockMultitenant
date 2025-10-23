import { Users, ShoppingCart, Package, TrendingUp, Plus, FileUp, UserPlus } from 'lucide-react';
import { KPICard } from '../KPICard';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const purchaseData = [
  { day: 'Lun', amount: 2400 },
  { day: 'Mar', amount: 3200 },
  { day: 'Mié', amount: 2800 },
  { day: 'Jue', amount: 3900 },
  { day: 'Vie', amount: 4200 },
  { day: 'Sáb', amount: 3100 },
  { day: 'Dom', amount: 2600 },
];

const stockHealthData = [
  { name: 'Óptimo', value: 45, color: '#47685C' },
  { name: 'Bajo', value: 30, color: '#A9C9A4' },
  { name: 'Crítico', value: 15, color: '#C1643B' },
  { name: 'Exceso', value: 10, color: '#5A8070' },
];

const expirationData = [
  { week: 'Semana 1', products: 5 },
  { week: 'Semana 2', products: 12 },
  { week: 'Semana 3', products: 8 },
  { week: 'Semana 4', products: 15 },
];

export function Dashboard() {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('es-AR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="relative pb-20 md:pb-0">
      {/* Header */}
      <div className="md:px-8 px-4 md:pt-8 pt-4 md:pb-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 
              className="mb-2 md:text-[1.75rem] text-[1.375rem]"
              style={{ 
                fontFamily: 'var(--font-family-heading)', 
                fontWeight: 600,
                color: '#1F1F1F',
                letterSpacing: '-0.02em'
              }}
            >
              Dashboard
            </h1>
            <p 
              className="m-0 md:block hidden"
              style={{
                fontFamily: 'var(--font-family-body)',
                fontSize: '0.9375rem',
                color: '#5A8070'
              }}
            >
              Bienvenida, María. Aquí está tu resumen operativo.
            </p>
          </div>
          <div className="md:flex gap-2 hidden">
            <Button variant="outline" className="gap-2 border-[#D8D8D3] hover:border-[#47685C] rounded-lg" style={{ color: '#47685C' }}>
              <FileUp className="h-4 w-4" />
              Subir Factura
            </Button>
            <Button className="gap-2 rounded-lg" style={{ backgroundColor: '#47685C', color: '#F5F5F2' }}>
              <Plus className="h-4 w-4" />
              Nuevo Pedido
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="md:px-8 px-4 md:pb-8 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 md:gap-4 gap-3">
          <KPICard
            title="Total Proveedores"
            value="32"
            change="+4 este mes"
            changeType="positive"
            icon={Users}
          />
          <KPICard
            title="Pedidos Abiertos"
            value="18"
            change="6 pendientes"
            changeType="neutral"
            icon={ShoppingCart}
          />
          <KPICard
            title="Productos por Vencer"
            value="23"
            change="15 en 7 días"
            changeType="negative"
            icon={Package}
          />
          <KPICard
            title="Presupuesto Usado"
            value="67%"
            change="$8,450 / $12,600"
            changeType="positive"
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="md:px-8 px-4 md:pb-8 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 md:gap-4 gap-3">
          {/* Weekly Purchases */}
          <Card className="gestock-shadow gestock-hover-shadow border-0 rounded-xl" style={{ backgroundColor: '#E6DDC5' }}>
            <CardHeader className="md:pb-4 pb-3 md:p-6 p-4">
              <CardTitle 
                className="md:text-base text-sm"
                style={{ 
                  fontFamily: 'var(--font-family-heading)',
                  fontWeight: 600,
                  color: '#1F1F1F'
                }}
              >
                Compras Semanales
              </CardTitle>
            </CardHeader>
            <CardContent className="md:p-6 p-4 md:pt-0 pt-0">
              <div className="h-[180px] md:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={purchaseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D8D8D3" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', fill: '#5A8070' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', fill: '#5A8070' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      fontFamily: 'var(--font-family-body)',
                      borderRadius: '8px',
                      border: '1px solid #D8D8D3',
                      boxShadow: '0 4px 12px rgba(31, 31, 31, 0.12)',
                      backgroundColor: '#FAFAF9'
                    }}
                    cursor={{ fill: '#D8D8D3', opacity: 0.5 }}
                  />
                  <Bar dataKey="amount" fill="#47685C" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Stock Health */}
          <Card className="gestock-shadow gestock-hover-shadow border-0 rounded-xl" style={{ backgroundColor: '#E6DDC5' }}>
            <CardHeader className="md:pb-4 pb-3 md:p-6 p-4">
              <CardTitle 
                className="md:text-base text-sm"
                style={{ 
                  fontFamily: 'var(--font-family-heading)',
                  fontWeight: 600,
                  color: '#1F1F1F'
                }}
              >
                Estado del Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="md:p-6 p-4 md:pt-0 pt-0">
              <div className="flex items-center justify-center h-[180px] md:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockHealthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stockHealthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        fontFamily: 'var(--font-family-body)',
                        borderRadius: '8px',
                        border: '1px solid #D8D8D3',
                        boxShadow: '0 4px 12px rgba(31, 31, 31, 0.12)',
                        backgroundColor: '#FAFAF9'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 md:gap-3 gap-2 md:mt-4 mt-3">
                {stockHealthData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="md:text-[13px] text-[12px]" style={{ fontFamily: 'var(--font-family-body)', color: '#1F1F1F' }}>
                      {item.name}: {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expirations Chart */}
      <div className="md:px-8 px-4 md:pb-8 pb-4">
        <Card className="gestock-shadow gestock-hover-shadow border-0 rounded-xl" style={{ backgroundColor: '#E6DDC5' }}>
          <CardHeader className="md:pb-4 pb-3 md:p-6 p-4">
            <CardTitle 
              className="md:text-base text-sm"
              style={{ 
                fontFamily: 'var(--font-family-heading)',
                fontWeight: 600,
                color: '#1F1F1F'
              }}
            >
              Vencimientos Próximos
            </CardTitle>
          </CardHeader>
          <CardContent className="md:p-6 p-4 md:pt-0 pt-0">
            <div className="h-[160px] md:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
              <LineChart data={expirationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D8D8D3" vertical={false} />
                <XAxis 
                  dataKey="week" 
                  axisLine={false}
                  tickLine={false}
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', fill: '#5A8070' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', fill: '#5A8070' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: 'var(--font-family-body)',
                    borderRadius: '8px',
                    border: '1px solid #D8D8D3',
                    boxShadow: '0 4px 12px rgba(31, 31, 31, 0.12)',
                    backgroundColor: '#FAFAF9'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="products" 
                  stroke="#C1643B" 
                  strokeWidth={2.5}
                  dot={{ fill: '#C1643B', r: 5, strokeWidth: 2, stroke: '#FAFAF9' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="md:px-8 px-4 md:pb-8 pb-4">
        <Card className="gestock-shadow gestock-hover-shadow border-0 rounded-xl" style={{ backgroundColor: '#FAFAF9' }}>
          <CardHeader className="md:pb-4 pb-3 md:p-6 p-4">
            <CardTitle 
              className="md:text-base text-sm"
              style={{ 
                fontFamily: 'var(--font-family-heading)',
                fontWeight: 600,
                color: '#1F1F1F'
              }}
            >
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="md:p-6 p-4 md:pt-0 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 md:gap-3 gap-2">
              <Button 
                variant="outline" 
                className="h-auto md:py-6 py-4 flex-col md:gap-3 gap-2 border-[#D8D8D3] hover:border-[#47685C] hover:bg-[#A9C9A4]/20 transition-all rounded-lg"
              >
                <div className="md:w-10 md:h-10 w-8 h-8 rounded-lg bg-[#47685C]/10 flex items-center justify-center">
                  <Plus className="md:h-5 md:w-5 h-4 w-4 text-[#47685C]" strokeWidth={2} />
                </div>
                <span className="md:text-[14px] text-[13px]" style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500, color: '#1F1F1F' }}>
                  Nuevo Pedido
                </span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto md:py-6 py-4 flex-col md:gap-3 gap-2 border-[#D8D8D3] hover:border-[#47685C] hover:bg-[#A9C9A4]/20 transition-all rounded-lg"
              >
                <div className="md:w-10 md:h-10 w-8 h-8 rounded-lg bg-[#47685C]/10 flex items-center justify-center">
                  <UserPlus className="md:h-5 md:w-5 h-4 w-4 text-[#47685C]" strokeWidth={2} />
                </div>
                <span className="md:text-[14px] text-[13px]" style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500, color: '#1F1F1F' }}>
                  Agregar Proveedor
                </span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto md:py-6 py-4 flex-col md:gap-3 gap-2 border-[#D8D8D3] hover:border-[#47685C] hover:bg-[#A9C9A4]/20 transition-all rounded-lg"
              >
                <div className="md:w-10 md:h-10 w-8 h-8 rounded-lg bg-[#47685C]/10 flex items-center justify-center">
                  <FileUp className="md:h-5 md:w-5 h-4 w-4 text-[#47685C]" strokeWidth={2} />
                </div>
                <span className="md:text-[14px] text-[13px]" style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500, color: '#1F1F1F' }}>
                  Subir Factura
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Updated Timestamp */}
      <div className="px-8 pb-6 flex justify-end">
        <div 
          className="text-[#8EA68B]"
          style={{ 
            fontFamily: 'var(--font-family-mono)', 
            fontSize: '0.6875rem',
            letterSpacing: '0.02em'
          }}
        >
          Última actualización: {formattedDate}
        </div>
      </div>
    </div>
  );
}
