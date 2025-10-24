import { AlertTriangle, Calendar, Package, Filter, Eye } from 'lucide-react';
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
    urgency: 'critical' as const,
    category: 'Lácteos',
  },
  {
    id: 2,
    name: 'Pan Integral Artesanal',
    supplier: 'Panadería Artesanal',
    quantity: 15,
    expirationDate: '2025-10-22',
    daysUntilExpiry: 1,
    urgency: 'critical' as const,
    category: 'Panadería',
  },
  {
    id: 3,
    name: 'Lechuga Orgánica',
    supplier: 'Verduras Orgánicas del Valle',
    quantity: 18,
    expirationDate: '2025-10-25',
    daysUntilExpiry: 4,
    urgency: 'upcoming' as const,
    category: 'Verduras',
  },
  {
    id: 4,
    name: 'Queso Brie Importado',
    supplier: 'Lácteos La Pradera',
    quantity: 8,
    expirationDate: '2025-10-28',
    daysUntilExpiry: 7,
    urgency: 'upcoming' as const,
    category: 'Lácteos',
  },
  {
    id: 5,
    name: 'Banana Ecuatoriana',
    supplier: 'Frutas Tropicales SA',
    quantity: 30,
    expirationDate: '2025-11-05',
    daysUntilExpiry: 15,
    urgency: 'safe' as const,
    category: 'Frutas',
  },
  {
    id: 6,
    name: 'Tomates Cherry',
    supplier: 'Verduras Orgánicas del Valle',
    quantity: 12,
    expirationDate: '2025-10-24',
    daysUntilExpiry: 3,
    urgency: 'critical' as const,
    category: 'Verduras',
  },
  {
    id: 7,
    name: 'Almendras Naturales',
    supplier: 'Cereales Integrales',
    quantity: 8,
    expirationDate: '2025-10-29',
    daysUntilExpiry: 8,
    urgency: 'upcoming' as const,
    category: 'Frutos Secos',
  },
  {
    id: 8,
    name: 'Quinoa Orgánica',
    supplier: 'Cereales Integrales',
    quantity: 20,
    expirationDate: '2025-11-12',
    daysUntilExpiry: 22,
    urgency: 'safe' as const,
    category: 'Cereales',
  },
];

// Color hierarchy: Copper (Critical 0-3 días) → Sage (Upcoming 4-10 días) → Blue Gray (Safe 10+ días)
const urgencyConfig = {
  critical: {
    label: 'Crítico',
    color: '#C1643B',
    bgColor: 'rgba(193, 100, 59, 0.1)',
    borderColor: 'rgba(193, 100, 59, 0.4)',
    icon: '🚨',
  },
  upcoming: {
    label: 'Próximo',
    color: '#A9CDB6',
    bgColor: 'rgba(169, 205, 182, 0.08)',
    borderColor: 'rgba(169, 205, 182, 0.3)',
    icon: '⚠️',
  },
  safe: {
    label: 'Seguro',
    color: '#7292B2',
    bgColor: 'rgba(114, 146, 178, 0.08)',
    borderColor: 'rgba(114, 146, 178, 0.2)',
    icon: '✓',
  },
};

export function Expirations() {
  const criticalCount = expirationProducts.filter(p => p.urgency === 'critical').length;
  const upcomingCount = expirationProducts.filter(p => p.urgency === 'upcoming').length;
  const safeCount = expirationProducts.filter(p => p.urgency === 'safe').length;

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

      {/* Alert Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card 
          className="gestock-shadow transition-all duration-150 hover:shadow-lg"
          style={{
            borderRadius: '12px',
            border: '1px solid rgba(193, 100, 59, 0.4)',
            backgroundColor: 'rgba(193, 100, 59, 0.08)',
          }}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#C1643B' }}
              >
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
                  Crítico (0-3 días)
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
            border: '1px solid rgba(169, 205, 182, 0.3)',
            backgroundColor: 'rgba(169, 205, 182, 0.05)',
          }}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(169, 205, 182, 0.2)' }}
              >
                <Calendar className="h-6 w-6" style={{ color: '#A9CDB6' }} />
              </div>
              <div>
                <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
                  Próximo (4-10 días)
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)', color: '#A9CDB6' }}>
                  {upcomingCount}
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
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(114, 146, 178, 0.15)' }}
              >
                <Package className="h-6 w-6" style={{ color: '#7292B2' }} />
              </div>
              <div>
                <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
                  Seguro (10+ días)
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)', color: '#7292B2' }}>
                  {safeCount}
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
                  <SelectItem value="lacteos">Lácteos</SelectItem>
                  <SelectItem value="panaderia">Panadería</SelectItem>
                  <SelectItem value="verduras">Verduras</SelectItem>
                  <SelectItem value="frutas">Frutas</SelectItem>
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
                  <SelectValue placeholder="Todas las urgencias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las urgencias</SelectItem>
                  <SelectItem value="critical">Crítico (0-3 días)</SelectItem>
                  <SelectItem value="upcoming">Próximo (4-10 días)</SelectItem>
                  <SelectItem value="safe">Seguro (10+ días)</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                className="gap-2 h-10 rounded-lg ml-auto transition-all duration-150 hover:bg-[#3A4A42]"
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

      {/* Products Compact List */}
      <div className="space-y-3">
        {expirationProducts.map((product) => {
          const config = urgencyConfig[product.urgency];
          
          return (
            <Card 
              key={product.id} 
              className="gestock-shadow transition-all duration-150 hover:shadow-lg hover:scale-[1.01]"
              style={{
                borderRadius: '12px',
                border: `1px solid ${config.borderColor}`,
                backgroundColor: config.bgColor,
              }}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  {/* Urgency Indicator */}
                  <div 
                    className="flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `${config.color}20`,
                      border: `2px solid ${config.color}40`,
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{config.icon}</span>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="truncate mb-1"
                          style={{ 
                            fontFamily: 'var(--font-family-body)',
                            fontWeight: 600,
                            color: '#F5F5F2',
                          }}
                        >
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-3 text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                          <span>{product.supplier}</span>
                          <span>•</span>
                          <Badge 
                            variant="outline"
                            style={{
                              fontSize: 'var(--text-xs)',
                              borderColor: 'rgba(114, 146, 178, 0.3)',
                              color: '#7292B2',
                              backgroundColor: 'rgba(114, 146, 178, 0.08)',
                            }}
                          >
                            {product.category}
                          </Badge>
                        </div>
                      </div>
                      
                      <Badge
                        style={{
                          backgroundColor: config.bgColor,
                          color: config.color,
                          border: `1px solid ${config.color}60`,
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          flexShrink: 0,
                        }}
                      >
                        {config.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-6 mt-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                          Cantidad:
                        </span>
                        <span 
                          style={{ 
                            fontFamily: 'var(--font-family-mono)',
                            fontSize: 'var(--text-sm)',
                            color: '#7292B2',
                            fontWeight: 600,
                          }}
                        >
                          {product.quantity} un.
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                          Vence:
                        </span>
                        <span 
                          style={{ 
                            fontFamily: 'var(--font-family-mono)',
                            fontSize: 'var(--text-sm)',
                            color: config.color,
                            fontWeight: 600,
                          }}
                        >
                          {new Date(product.expirationDate).toLocaleDateString('es-AR')}
                        </span>
                      </div>

                      <div 
                        className="flex items-center gap-1.5 px-3 py-1 rounded"
                        style={{
                          backgroundColor: `${config.color}15`,
                          color: config.color,
                        }}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                          {product.daysUntilExpiry} {product.daysUntilExpiry === 1 ? 'día' : 'días'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button 
                    className="gestock-btn-secondary gap-2 rounded-lg h-9 flex-shrink-0"
                  >
                    <Eye className="h-4 w-4" />
                    Ver detalle
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
