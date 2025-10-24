import { Plus, Search, Filter, Mail, Phone, Calendar, Edit, Archive, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const suppliers = [
  {
    id: 1,
    name: 'Verduras Orgánicas del Valle',
    category: 'Semanal',
    contact: 'Juan Pérez',
    email: 'juan@verdurasvalle.com',
    phone: '+54 11 4567-8901',
    nextOrder: '2025-10-23',
    totalOrders: 48,
    paymentType: 'Contado',
    isActive: true,
  },
  {
    id: 2,
    name: 'Lácteos La Pradera',
    category: 'Bisemanal',
    contact: 'María González',
    email: 'maria@lacteospradera.com',
    phone: '+54 11 4567-8902',
    nextOrder: '2025-10-25',
    totalOrders: 32,
    paymentType: 'Cuenta Corriente',
    isActive: true,
  },
  {
    id: 3,
    name: 'Panadería Artesanal',
    category: 'Semanal',
    contact: 'Carlos Martínez',
    email: 'carlos@panaderia.com',
    phone: '+54 11 4567-8903',
    nextOrder: '2025-10-22',
    totalOrders: 56,
    paymentType: 'Contado',
    isActive: true,
  },
  {
    id: 4,
    name: 'Frutas Tropicales SA',
    category: 'Mensual',
    contact: 'Ana Silva',
    email: 'ana@frutastropicales.com',
    phone: '+54 11 4567-8904',
    nextOrder: '2025-11-05',
    totalOrders: 12,
    paymentType: 'Cuenta Corriente',
    isActive: false,
  },
  {
    id: 5,
    name: 'Cereales Integrales',
    category: 'Bisemanal',
    contact: 'Roberto Díaz',
    email: 'roberto@cereales.com',
    phone: '+54 11 4567-8905',
    nextOrder: '2025-10-27',
    totalOrders: 28,
    paymentType: 'Cuenta Corriente',
    isActive: true,
  },
];

const categoryColors: Record<string, string> = {
  'Semanal': 'bg-[#7DAA92] text-white',
  'Bisemanal': 'bg-[#A9CDB6] text-[#2C3A33]',
  'Mensual': 'bg-[#7292B2] text-white',
};

export function Suppliers() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-family-heading)', marginBottom: '0.5rem' }}>
            Proveedores
          </h1>
          <p className="text-muted-foreground m-0">
            Gestiona tus proveedores y sus frecuencias de pedido
          </p>
        </div>
        <Button className="gestock-btn-secondary gap-2 rounded-xl h-11">
          <Plus className="h-4 w-4" />
          Agregar Proveedor
        </Button>
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
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar proveedor..."
                  className="pl-10 rounded-lg h-10 transition-all duration-150"
                  style={{
                    backgroundColor: 'rgba(44, 58, 51, 0.4)',
                    border: '1px solid rgba(75, 91, 83, 0.2)',
                  }}
                />
              </div>
              <Button 
                className="gap-2 h-10 rounded-lg transition-all duration-150 hover:bg-[#3A4A42]"
                variant="outline"
                style={{
                  borderColor: 'rgba(169, 205, 182, 0.3)',
                  color: '#A9CDB6',
                }}
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card 
        className="gestock-shadow"
        style={{
          borderRadius: '12px',
          border: '1px solid rgba(75, 91, 83, 0.15)',
        }}
      >
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: 'rgba(75, 91, 83, 0.2)' }}>
                <TableHead>Proveedor</TableHead>
                <TableHead>Frecuencia</TableHead>
                <TableHead>Próximo Pedido</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow 
                  key={supplier.id}
                  className="transition-all duration-150 hover:bg-[rgba(115,148,176,0.05)]"
                  style={{ borderColor: 'rgba(75, 91, 83, 0.1)' }}
                >
                  <TableCell>
                    <div>
                      <div style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500, color: '#F5F5F2' }}>
                        {supplier.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span style={{ fontSize: 'var(--text-xs)' }}>{supplier.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={categoryColors[supplier.category]}
                      style={{
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                      }}
                    >
                      {supplier.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" style={{ color: '#7292B2' }} />
                      <span 
                        style={{ 
                          fontFamily: 'var(--font-family-mono)',
                          color: '#7292B2',
                          fontSize: 'var(--text-sm)',
                        }}
                      >
                        {new Date(supplier.nextOrder).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span 
                      style={{ 
                        fontFamily: 'var(--font-family-body)',
                        color: '#B9BBB8',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      {supplier.paymentType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span 
                      style={{ 
                        fontFamily: 'var(--font-family-mono)',
                        color: '#7292B2',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                      }}
                    >
                      {supplier.totalOrders}
                    </span>
                  </TableCell>
                  <TableCell>
                    {supplier.isActive ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" style={{ color: '#7DAA92' }} />
                        <span style={{ color: '#7DAA92', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                          Activo
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4" style={{ color: '#B9BBB8', opacity: 0.6 }} />
                        <span style={{ color: '#B9BBB8', fontSize: 'var(--text-sm)', opacity: 0.6 }}>
                          Inactivo
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 px-3 rounded-lg transition-all duration-150 hover:bg-[rgba(115,148,176,0.1)]"
                          style={{ color: '#A9CDB6' }}
                        >
                          Acciones
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        style={{
                          backgroundColor: '#2C3A33',
                          border: '1px solid rgba(75, 91, 83, 0.3)',
                          borderRadius: '10px',
                        }}
                      >
                        <DropdownMenuItem className="focus:bg-[rgba(115,148,176,0.1)]">
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Historial
                        </DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-[rgba(115,148,176,0.1)]">
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="focus:bg-[rgba(193,100,59,0.1)]"
                          style={{ color: '#C1643B' }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
