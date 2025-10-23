import { Plus, Filter, Download, Eye, Edit2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { StatusChip } from '../StatusChip';
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

const orders = [
  {
    id: 'ORD-001',
    supplier: 'Verduras Orgánicas del Valle',
    products: 'Lechuga, Tomate, Zanahoria',
    quantity: 45,
    total: 3250,
    status: 'pending' as const,
    date: '2025-10-21',
    branch: 'Palermo',
  },
  {
    id: 'ORD-002',
    supplier: 'Lácteos La Pradera',
    products: 'Leche, Yogurt, Queso',
    quantity: 30,
    total: 4800,
    status: 'ordered' as const,
    date: '2025-10-20',
    branch: 'Belgrano',
  },
  {
    id: 'ORD-003',
    supplier: 'Panadería Artesanal',
    products: 'Pan Integral, Facturas',
    quantity: 60,
    total: 2100,
    status: 'received' as const,
    date: '2025-10-19',
    branch: 'Palermo',
  },
  {
    id: 'ORD-004',
    supplier: 'Frutas Tropicales SA',
    products: 'Banana, Manzana, Naranja',
    quantity: 35,
    total: 2850,
    status: 'paid' as const,
    date: '2025-10-18',
    branch: 'Recoleta',
  },
  {
    id: 'ORD-005',
    supplier: 'Cereales Integrales',
    products: 'Avena, Granola, Quinoa',
    quantity: 25,
    total: 3600,
    status: 'ordered' as const,
    date: '2025-10-21',
    branch: 'Belgrano',
  },
];

const statusLabels = {
  pending: 'Pendiente',
  ordered: 'Pedido',
  received: 'Recibido',
  paid: 'Pagado',
};

interface OrdersProps {
  onViewOrder?: () => void;
  onEditOrder?: () => void;
}

export function Orders({ onViewOrder, onEditOrder }: OrdersProps) {
  const totalBudget = 12600;
  const usedBudget = 8450;
  const budgetPercentage = (usedBudget / totalBudget) * 100;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-family-heading)', marginBottom: '0.5rem' }}>
            Pedidos
          </h1>
          <p className="text-muted-foreground m-0">
            Gestiona tus pedidos y su estado actual
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button 
            className="gap-2 bg-accent hover:bg-accent/90"
            onClick={onEditOrder}
          >
            <Plus className="h-4 w-4" />
            Nuevo Pedido
          </Button>
        </div>
      </div>

      {/* Budget Progress */}
      <Card className="gestock-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="m-0 mb-1" style={{ fontFamily: 'var(--font-family-heading)' }}>
                Presupuesto Semanal
              </h3>
              <p className="text-muted-foreground m-0" style={{ fontSize: 'var(--text-sm)' }}>
                ${usedBudget.toLocaleString()} de ${totalBudget.toLocaleString()} utilizados
              </p>
            </div>
            <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)' }}>
              {budgetPercentage.toFixed(0)}%
            </div>
          </div>
          <Progress value={budgetPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="gestock-shadow">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas las sucursales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                <SelectItem value="palermo">Palermo</SelectItem>
                <SelectItem value="belgrano">Belgrano</SelectItem>
                <SelectItem value="recoleta">Recoleta</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="ordered">Pedido</SelectItem>
                <SelectItem value="received">Recibido</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="week">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Esta semana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="quarter">Este trimestre</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2 ml-auto">
              <Filter className="h-4 w-4" />
              Más Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="gestock-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pedido</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-[#E6DDC5]/30">
                  <TableCell style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500 }}>
                    {order.id}
                  </TableCell>
                  <TableCell style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500 }}>
                    {order.supplier}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.products}
                  </TableCell>
                  <TableCell style={{ fontFamily: 'var(--font-family-mono)' }}>
                    {order.quantity} items
                  </TableCell>
                  <TableCell style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 500 }}>
                    ${order.total.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <StatusChip 
                      status={order.status} 
                      label={statusLabels[order.status]} 
                    />
                  </TableCell>
                  <TableCell>{order.branch}</TableCell>
                  <TableCell style={{ fontFamily: 'var(--font-family-mono)' }}>
                    {new Date(order.date).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-[#2C4653]/10 hover:text-[#2C4653]"
                        onClick={onEditOrder}
                        title="Editar pedido"
                      >
                        <Edit2 className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-[#47685C]/10 hover:text-[#47685C]"
                        onClick={onViewOrder}
                        title="Ver pedido"
                      >
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="gestock-shadow">
          <CardContent className="p-4">
            <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
              Total Pedidos
            </div>
            <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-xl)' }}>
              {orders.length}
            </div>
          </CardContent>
        </Card>
        <Card className="gestock-shadow">
          <CardContent className="p-4">
            <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
              Monto Total
            </div>
            <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-xl)' }}>
              ${orders.reduce((sum, order) => sum + order.total, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="gestock-shadow">
          <CardContent className="p-4">
            <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
              Pendientes
            </div>
            <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-xl)' }}>
              {orders.filter(o => o.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card className="gestock-shadow">
          <CardContent className="p-4">
            <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
              Completados
            </div>
            <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-xl)' }}>
              {orders.filter(o => o.status === 'paid').length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
