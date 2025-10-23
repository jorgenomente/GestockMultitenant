import { Package, Search, Filter, Plus, TrendingDown, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
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
];

const statusConfig = {
  optimal: { label: 'Óptimo', color: 'bg-[#3BA275] text-white' },
  low: { label: 'Bajo', color: 'bg-[#C07953] text-white' },
  critical: { label: 'Crítico', color: 'bg-[#C07953] text-white' },
  excess: { label: 'Exceso', color: 'bg-[#8EA68B] text-white' },
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
        <Button className="gap-2 bg-accent hover:bg-accent/90">
          <Plus className="h-4 w-4" />
          Agregar Producto
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3BA275]/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-[#3BA275]" />
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                  Stock Óptimo
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-xl)' }}>
                  {optimalCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#C07953]/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-[#C07953]" />
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                  Stock Bajo
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-xl)' }}>
                  {lowCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#C07953] bg-[#C07953]/5 gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#C07953] flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                  Stock Crítico
                </div>
                <div className="text-[#C07953]" style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-xl)' }}>
                  {criticalCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                  Total Productos
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-xl)' }}>
                  {stockItems.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="gestock-shadow">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                className="pl-10 bg-input-background"
              />
            </div>

            <Select defaultValue="all">
              <SelectTrigger className="w-48">
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
              <SelectTrigger className="w-48">
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

            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Más Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card className="gestock-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Nivel Actual</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última Actualización</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockItems.map((item) => {
                const stockPercentage = (item.current / item.maximum) * 100;
                const config = statusConfig[item.status];
                
                return (
                  <TableRow key={item.id}>
                    <TableCell style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500 }}>
                      {item.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--text-sm)' }}>
                          {item.current} {item.unit}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                          <span>Min: {item.minimum}</span>
                          <span>·</span>
                          <span>Max: {item.maximum}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-32">
                        <Progress value={stockPercentage} className="h-2" />
                        <div className="text-muted-foreground mt-1" style={{ fontSize: 'var(--text-xs)' }}>
                          {stockPercentage.toFixed(0)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.supplier}
                    </TableCell>
                    <TableCell>
                      <Badge className={config.color}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--text-sm)' }}>
                      {new Date(item.lastUpdate).toLocaleDateString('es-AR')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
