import { Plus, Search, Filter, Mail, Phone, Calendar, Edit, Archive, Eye } from 'lucide-react';
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
  },
];

const categoryColors: Record<string, string> = {
  'Semanal': 'bg-[#3BA275] text-white',
  'Bisemanal': 'bg-[#8EA68B] text-white',
  'Mensual': 'bg-[#E9E3D0] text-[#111827]',
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
        <Button className="gap-2 bg-accent hover:bg-accent/90">
          <Plus className="h-4 w-4" />
          Agregar Proveedor
        </Button>
      </div>

      {/* Filters */}
      <Card className="gestock-shadow">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proveedor..."
                className="pl-10 bg-input-background"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card className="gestock-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Frecuencia</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Próximo Pedido</TableHead>
                <TableHead>Pedidos Totales</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div>
                      <div style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500 }}>
                        {supplier.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span style={{ fontSize: 'var(--text-xs)' }}>{supplier.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={categoryColors[supplier.category]}>
                      {supplier.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div style={{ fontFamily: 'var(--font-family-body)' }}>
                        {supplier.contact}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span style={{ fontSize: 'var(--text-xs)' }}>{supplier.phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span style={{ fontFamily: 'var(--font-family-mono)' }}>
                        {new Date(supplier.nextOrder).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell style={{ fontFamily: 'var(--font-family-mono)' }}>
                    {supplier.totalOrders}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Acciones
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Historial
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
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
