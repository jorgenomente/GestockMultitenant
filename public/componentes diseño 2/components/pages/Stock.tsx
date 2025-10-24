import { Package, Search, Filter, Plus, TrendingDown, AlertTriangle, Box } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const stockItems = [
  {
    id: 1,
    name: 'Lechuga Orgánica',
    category: 'Verduras',
    current: 45,
    minimum: 20,
    maximum: 60,
    unit: 'unidades',
    supplier: 'Verduras Valle',
    lastUpdate: '2025-10-21',
    status: 'optimal' as const,
  },
  {
    id: 2,
    name: 'Leche Entera 1L',
    category: 'Lácteos',
    current: 18,
    minimum: 30,
    maximum: 80,
    unit: 'litros',
    supplier: 'Lácteos La Pradera',
    lastUpdate: '2025-10-20',
    status: 'low' as const,
  },
  {
    id: 3,
    name: 'Pan Integral',
    category: 'Panadería',
    current: 25,
    minimum: 15,
    maximum: 40,
    unit: 'unidades',
    supplier: 'Panadería Artesanal',
    lastUpdate: '2025-10-21',
    status: 'optimal' as const,
  },
  {
    id: 4,
    name: 'Banana',
    category: 'Frutas',
    current: 8,
    minimum: 25,
    maximum: 50,
    unit: 'kg',
    supplier: 'Frutas Tropicales',
    lastUpdate: '2025-10-19',
    status: 'critical' as const,
  },
  {
    id: 5,
    name: 'Quinoa Orgánica',
    category: 'Cereales',
    current: 52,
    minimum: 15,
    maximum: 40,
    unit: 'kg',
    supplier: 'Cereales Integrales',
    lastUpdate: '2025-10-21',
    status: 'excess' as const,
  },
  {
    id: 6,
    name: 'Yogurt Natural',
    category: 'Lácteos',
    current: 35,
    minimum: 25,
    maximum: 50,
    unit: 'unidades',
    supplier: 'Lácteos La Pradera',
    lastUpdate: '2025-10-21',
    status: 'optimal' as const,
  },
  {
    id: 7,
    name: 'Tomate Cherry',
    category: 'Verduras',
    current: 12,
    minimum: 15,
    maximum: 35,
    unit: 'kg',
    supplier: 'Verduras Valle',
    lastUpdate: '2025-10-21',
    status: 'low' as const,
  },
  {
    id: 8,
    name: 'Almendras',
    category: 'Frutos Secos',
    current: 22,
    minimum: 10,
    maximum: 30,
    unit: 'kg',
    supplier: 'Cereales Integrales',
    lastUpdate: '2025-10-20',
    status: 'optimal' as const,
  },
];

const statusConfig = {
  optimal: { label: 'Disponible', color: '#7DAA92', bgColor: 'rgba(125, 170, 146, 0.1)' },
  low: { label: 'Bajo', color: '#E9A668', bgColor: 'rgba(233, 166, 104, 0.1)' },
  critical: { label: 'Crítico', color: '#C1643B', bgColor: 'rgba(193, 100, 59, 0.1)' },
  excess: { label: 'Exceso', color: '#7292B2', bgColor: 'rgba(114, 146, 178, 0.1)' },
};

export function Stock() {
  const optimalCount = stockItems.filter(i => i.status === 'optimal').length;
  const lowCount = stockItems.filter(i => i.status === 'low').length;
  const criticalCount = stockItems.filter(i => i.status === 'critical').length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-family-heading)', marginBottom: '0.5rem' }}>
            Stock
          </h1>
          <p className="text-muted-foreground m-0">
            Monitorea y controla tus niveles de inventario
          </p>
        </div>
        <Button className="gestock-btn-secondary gap-2 rounded-xl h-11">
          <Plus className="h-4 w-4" />
          Agregar Producto
        </Button>
      </div>

      {/* Status Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="gestock-shadow transition-all duration-150 hover:shadow-lg"
          style={{
            borderRadius: '12px',
            border: '1px solid rgba(125, 170, 146, 0.2)',
            backgroundColor: 'rgba(125, 170, 146, 0.05)',
          }}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(125, 170, 146, 0.15)' }}
              >
                <Package className="h-5 w-5" style={{ color: '#7DAA92' }} />
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)', marginBottom: '2px' }}>
                  Stock Óptimo
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)', color: '#7DAA92' }}>
                  {optimalCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="gestock-shadow transition-all duration-150 hover:shadow-lg"
          style={{
            borderRadius: '12px',
            border: '1px solid rgba(233, 166, 104, 0.2)',
            backgroundColor: 'rgba(233, 166, 104, 0.05)',
          }}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(233, 166, 104, 0.15)' }}
              >
                <TrendingDown className="h-5 w-5" style={{ color: '#E9A668' }} />
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)', marginBottom: '2px' }}>
                  Stock Bajo
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)', color: '#E9A668' }}>
                  {lowCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="gestock-shadow transition-all duration-150 hover:shadow-lg"
          style={{
            borderRadius: '12px',
            border: '1px solid rgba(193, 100, 59, 0.3)',
            backgroundColor: 'rgba(193, 100, 59, 0.08)',
          }}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#C1643B' }}
              >
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)', marginBottom: '2px' }}>
                  Stock Crítico
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)', color: '#C1643B' }}>
                  {criticalCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="gestock-shadow transition-all duration-150 hover:shadow-lg"
          style={{
            borderRadius: '12px',
            border: '1px solid rgba(114, 146, 178, 0.2)',
          }}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(114, 146, 178, 0.15)' }}
              >
                <Box className="h-5 w-5" style={{ color: '#7292B2' }} />
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)', marginBottom: '2px' }}>
                  Total Productos
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)', color: '#7292B2' }}>
                  {stockItems.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Sticky */}
      <div className="sticky top-0 z-10" style={{ paddingTop: '1px' }}>
        <Card 
          className="gestock-shadow"
          style={{
            borderRadius: '12px',
            border: '1px solid rgba(75, 91, 83, 0.15)',
          }}
        >
          <CardContent className="p-5">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  className="pl-10 rounded-lg h-10 transition-all duration-150"
                  style={{
                    backgroundColor: 'rgba(44, 58, 51, 0.4)',
                    border: '1px solid rgba(75, 91, 83, 0.2)',
                  }}
                />
              </div>

              <Select defaultValue="all">
                <SelectTrigger 
                  className="w-48 h-10 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(44, 58, 51, 0.4)',
                    border: '1px solid rgba(75, 91, 83, 0.2)',
                  }}
                >
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="verduras">Verduras</SelectItem>
                  <SelectItem value="lacteos">Lácteos</SelectItem>
                  <SelectItem value="panaderia">Panadería</SelectItem>
                  <SelectItem value="frutas">Frutas</SelectItem>
                  <SelectItem value="cereales">Cereales</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all">
                <SelectTrigger 
                  className="w-48 h-10 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(44, 58, 51, 0.4)',
                    border: '1px solid rgba(75, 91, 83, 0.2)',
                  }}
                >
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="optimal">Óptimo</SelectItem>
                  <SelectItem value="low">Bajo</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="excess">Exceso</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                className="gap-2 h-10 rounded-lg transition-all duration-150 hover:bg-[#3A4A42]"
                variant="outline"
                style={{
                  borderColor: 'rgba(169, 205, 182, 0.3)',
                  color: '#A9CDB6',
                }}
              >
                <Filter className="h-4 w-4" />
                Más Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stockItems.map((item) => {
          const stockPercentage = (item.current / item.maximum) * 100;
          const config = statusConfig[item.status];
          
          return (
            <Card
              key={item.id}
              className="gestock-shadow transition-all duration-150 hover:shadow-lg hover:scale-[1.02]"
              style={{
                borderRadius: '12px',
                border: `1px solid ${config.color}30`,
                backgroundColor: config.bgColor,
              }}
            >
              <CardContent className="p-5">
                {/* Product Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 
                      style={{ 
                        fontFamily: 'var(--font-family-body)',
                        fontWeight: 600,
                        color: '#F5F5F2',
                        marginBottom: '4px',
                      }}
                    >
                      {item.name}
                    </h3>
                    <Badge 
                      variant="outline"
                      style={{
                        fontSize: 'var(--text-xs)',
                        borderColor: 'rgba(114, 146, 178, 0.3)',
                        color: '#7292B2',
                        backgroundColor: 'rgba(114, 146, 178, 0.08)',
                      }}
                    >
                      {item.category}
                    </Badge>
                  </div>
                  <Badge
                    style={{
                      backgroundColor: config.bgColor,
                      color: config.color,
                      border: `1px solid ${config.color}50`,
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {config.label}
                  </Badge>
                </div>

                {/* Stock Level */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                      Nivel Actual
                    </span>
                    <span 
                      style={{ 
                        fontFamily: 'var(--font-family-mono)',
                        fontSize: 'var(--text-lg)',
                        color: '#7292B2',
                        fontWeight: 600,
                      }}
                    >
                      {item.current} {item.unit}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(75, 91, 83, 0.2)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(stockPercentage, 100)}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                    <span>Min: {item.minimum}</span>
                    <span>{stockPercentage.toFixed(0)}%</span>
                    <span>Max: {item.maximum}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t" style={{ borderColor: 'rgba(75, 91, 83, 0.15)' }}>
                  <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                    <div className="mb-1">Proveedor: {item.supplier}</div>
                    <div style={{ fontFamily: 'var(--font-family-mono)' }}>
                      Actualizado: {new Date(item.lastUpdate).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                </div>

                {/* Reorder Indicator */}
                {(item.status === 'low' || item.status === 'critical') && (
                  <div 
                    className="mt-3 py-2 px-3 rounded-lg text-center transition-all duration-150 cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: item.status === 'critical' ? 'rgba(193, 100, 59, 0.15)' : 'rgba(233, 166, 104, 0.15)',
                      color: item.status === 'critical' ? '#C1643B' : '#E9A668',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                    }}
                  >
                    {item.status === 'critical' ? '🚨 Requiere pedido urgente' : '⚠️ Considerar reposición'}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
