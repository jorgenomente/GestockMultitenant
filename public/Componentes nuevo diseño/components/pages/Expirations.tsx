import { AlertTriangle, Calendar, Package, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const expirationProducts = [
  {
    id: 1,
    name: 'Yogurt Natural La Pradera',
    supplier: 'Lácteos La Pradera',
    quantity: 24,
    expirationDate: '2025-10-23',
    daysUntilExpiry: 2,
    urgency: 'urgent' as const,
    category: 'Lácteos',
  },
  {
    id: 2,
    name: 'Pan Integral Artesanal',
    supplier: 'Panadería Artesanal',
    quantity: 15,
    expirationDate: '2025-10-22',
    daysUntilExpiry: 1,
    urgency: 'urgent' as const,
    category: 'Panadería',
  },
  {
    id: 3,
    name: 'Lechuga Orgánica',
    supplier: 'Verduras Orgánicas del Valle',
    quantity: 18,
    expirationDate: '2025-10-25',
    daysUntilExpiry: 4,
    urgency: 'warning' as const,
    category: 'Verduras',
  },
  {
    id: 4,
    name: 'Queso Brie Importado',
    supplier: 'Lácteos La Pradera',
    quantity: 8,
    expirationDate: '2025-10-28',
    daysUntilExpiry: 7,
    urgency: 'warning' as const,
    category: 'Lácteos',
  },
  {
    id: 5,
    name: 'Banana Ecuatoriana',
    supplier: 'Frutas Tropicales SA',
    quantity: 30,
    expirationDate: '2025-10-30',
    daysUntilExpiry: 9,
    urgency: 'normal' as const,
    category: 'Frutas',
  },
  {
    id: 6,
    name: 'Tomates Cherry',
    supplier: 'Verduras Orgánicas del Valle',
    quantity: 12,
    expirationDate: '2025-10-24',
    daysUntilExpiry: 3,
    urgency: 'warning' as const,
    category: 'Verduras',
  },
];

const urgencyConfig = {
  urgent: {
    color: 'bg-[#C07953] border-[#C07953]',
    textColor: 'text-[#C07953]',
    label: 'Urgente',
  },
  warning: {
    color: 'bg-[#C07953]/10 border-[#C07953]/30',
    textColor: 'text-[#C07953]',
    label: 'Atención',
  },
  normal: {
    color: 'bg-[#E9E3D0] border-[#DAD7CD]',
    textColor: 'text-[#111827]',
    label: 'Normal',
  },
};

export function Expirations() {
  const urgentCount = expirationProducts.filter(p => p.urgency === 'urgent').length;
  const warningCount = expirationProducts.filter(p => p.urgency === 'warning').length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-family-heading)', marginBottom: '0.5rem' }}>
            Vencimientos
          </h1>
          <p className="text-muted-foreground m-0">
            Monitorea productos próximos a vencer y evita pérdidas
          </p>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#C07953] bg-[#C07953]/5 gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#C07953] flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
                  Vencen en 48h
                </div>
                <div className="text-[#C07953]" style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)' }}>
                  {urgentCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#C07953]/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-[#C07953]" />
              </div>
              <div>
                <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
                  Vencen esta semana
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)' }}>
                  {warningCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-accent" />
              </div>
              <div>
                <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
                  Total productos
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)' }}>
                  {expirationProducts.length}
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
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="lacteos">Lácteos</SelectItem>
                <SelectItem value="panaderia">Panadería</SelectItem>
                <SelectItem value="verduras">Verduras</SelectItem>
                <SelectItem value="frutas">Frutas</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas las urgencias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las urgencias</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="warning">Atención</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2 ml-auto">
              <Filter className="h-4 w-4" />
              Más Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {expirationProducts.map((product) => {
          const config = urgencyConfig[product.urgency];
          
          return (
            <Card 
              key={product.id} 
              className={`${config.color} border-2 gestock-shadow hover:gestock-shadow-lg transition-all`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="m-0" style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-lg)' }}>
                    {product.name}
                  </CardTitle>
                  <Badge className="bg-white/80 text-[#111827] border-0">
                    {config.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                      Proveedor
                    </span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                      {product.supplier}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                      Cantidad
                    </span>
                    <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                      {product.quantity} unidades
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                      Vencimiento
                    </span>
                    <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                      {new Date(product.expirationDate).toLocaleDateString('es-AR')}
                    </span>
                  </div>

                  <div className={`pt-3 border-t ${config.textColor}`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        Vence en {product.daysUntilExpiry} {product.daysUntilExpiry === 1 ? 'día' : 'días'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
