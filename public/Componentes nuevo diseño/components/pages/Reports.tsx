import { Download, Calendar, TrendingUp, FileText, PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const stockRotationData = [
  { product: 'Lechuga', rotation: 8.5 },
  { product: 'Tomate', rotation: 7.2 },
  { product: 'Pan', rotation: 9.1 },
  { product: 'Leche', rotation: 6.8 },
  { product: 'Yogurt', rotation: 5.4 },
  { product: 'Queso', rotation: 4.2 },
];

const orderTrendsData = [
  { month: 'May', orders: 42 },
  { month: 'Jun', orders: 48 },
  { month: 'Jul', orders: 45 },
  { month: 'Ago', orders: 52 },
  { month: 'Sep', orders: 58 },
  { month: 'Oct', orders: 62 },
];

const supplierReliabilityData = [
  { supplier: 'Verduras Valle', subject: 'Puntualidad', score: 90 },
  { supplier: 'Verduras Valle', subject: 'Calidad', score: 85 },
  { supplier: 'Verduras Valle', subject: 'Precio', score: 75 },
  { supplier: 'Verduras Valle', subject: 'Servicio', score: 88 },
  { supplier: 'Verduras Valle', subject: 'Disponibilidad', score: 92 },
];

const categoryPerformance = [
  { category: 'Verduras', sales: 12400, margin: 35 },
  { category: 'Lácteos', sales: 10800, margin: 28 },
  { category: 'Panadería', sales: 8600, margin: 42 },
  { category: 'Frutas', sales: 9200, margin: 32 },
  { category: 'Cereales', sales: 6400, margin: 38 },
];

export function Reports() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-family-heading)', marginBottom: '0.5rem' }}>
            Reportes
          </h1>
          <p className="text-muted-foreground m-0">
            Análisis detallado de tu operación
          </p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="month">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Último Mes</SelectItem>
              <SelectItem value="quarter">Último Trimestre</SelectItem>
              <SelectItem value="year">Último Año</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2 bg-accent hover:bg-accent/90">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                  Crecimiento
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-xl)' }}>
                  +12.3%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                  Total Pedidos
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-xl)' }}>
                  307
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#A3D4A4]/20 flex items-center justify-center">
                <PieChartIcon className="h-5 w-5 text-[#3BA275]" />
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                  Margen Promedio
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-xl)' }}>
                  34%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                  Rotación Promedio
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-xl)' }}>
                  6.9 días
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Rotation */}
        <Card className="gestock-shadow">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
              Rotación de Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockRotationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#DAD7CD" />
                <XAxis 
                  type="number"
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px' }}
                />
                <YAxis 
                  type="category"
                  dataKey="product"
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: 'var(--font-family-body)',
                    borderRadius: '8px',
                    border: '1px solid #DAD7CD'
                  }}
                />
                <Bar dataKey="rotation" fill="#3BA275" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Trends */}
        <Card className="gestock-shadow">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
              Tendencia de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={orderTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DAD7CD" />
                <XAxis 
                  dataKey="month"
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px' }}
                />
                <YAxis 
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: 'var(--font-family-body)',
                    borderRadius: '8px',
                    border: '1px solid #DAD7CD'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#2C3A33" 
                  strokeWidth={3}
                  dot={{ fill: '#2C3A33', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Reliability */}
        <Card className="gestock-shadow">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
              Confiabilidad de Proveedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={supplierReliabilityData}>
                <PolarGrid stroke="#DAD7CD" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: '12px' }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '10px' }}
                />
                <Radar 
                  name="Verduras Valle" 
                  dataKey="score" 
                  stroke="#3BA275" 
                  fill="#3BA275" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: 'var(--font-family-body)',
                    borderRadius: '8px',
                    border: '1px solid #DAD7CD'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card className="gestock-shadow">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
              Rendimiento por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DAD7CD" />
                <XAxis 
                  dataKey="category"
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: '12px' }}
                />
                <YAxis 
                  yAxisId="left"
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: 'var(--font-family-body)',
                    borderRadius: '8px',
                    border: '1px solid #DAD7CD'
                  }}
                />
                <Bar yAxisId="left" dataKey="sales" fill="#8EA68B" name="Ventas" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="right" dataKey="margin" fill="#3BA275" name="Margen %" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card className="gestock-shadow">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
            Opciones de Exportación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto py-6 flex-col gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <span>Exportar como PDF</span>
              <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                Reporte completo con gráficos
              </span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex-col gap-2">
              <Download className="h-6 w-6 text-accent" />
              <span>Exportar a Excel</span>
              <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                Datos crudos para análisis
              </span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex-col gap-2">
              <Calendar className="h-6 w-6 text-secondary" />
              <span>Programar Reporte</span>
              <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                Envío automático mensual
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
