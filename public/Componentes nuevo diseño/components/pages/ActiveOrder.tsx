import { ArrowLeft, Calendar, Building2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ProductCard } from '../ProductCard';
import { StatusChip } from '../StatusChip';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  unitsPerPack: number;
  weeklyAvg: number;
  salesLast2Weeks: number;
  salesLast30Days: number;
  currentStock: number;
  quantity: number;
  price: number;
  lastSaleDate: string;
  previousOrder: number;
  isSigned: boolean;
}

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Leche Entera 1L',
    unitsPerPack: 15,
    weeklyAvg: 45,
    salesLast2Weeks: 92,
    salesLast30Days: 187,
    currentStock: 28,
    quantity: 3,
    price: 24.50,
    lastSaleDate: '18/10/25',
    previousOrder: 4,
    isSigned: true,
  },
  {
    id: '2',
    name: 'Yogur Natural 500g',
    unitsPerPack: 12,
    weeklyAvg: 32,
    salesLast2Weeks: 67,
    salesLast30Days: 134,
    currentStock: 15,
    quantity: 2,
    price: 18.75,
    lastSaleDate: '20/10/25',
    previousOrder: 3,
    isSigned: true,
  },
  {
    id: '3',
    name: 'Queso Mantecoso 400g',
    unitsPerPack: 8,
    weeklyAvg: 18,
    salesLast2Weeks: 34,
    salesLast30Days: 71,
    currentStock: 6,
    quantity: 2,
    price: 45.20,
    lastSaleDate: '19/10/25',
    previousOrder: 2,
    isSigned: false,
  },
  {
    id: '4',
    name: 'Mantequilla 250g',
    unitsPerPack: 10,
    weeklyAvg: 25,
    salesLast2Weeks: 48,
    salesLast30Days: 98,
    currentStock: 12,
    quantity: 2,
    price: 32.00,
    lastSaleDate: '21/10/25',
    previousOrder: 2,
    isSigned: true,
  },
  {
    id: '5',
    name: 'Crema de Leche 200ml',
    unitsPerPack: 15,
    weeklyAvg: 20,
    salesLast2Weeks: 41,
    salesLast30Days: 85,
    currentStock: 8,
    quantity: 1,
    price: 15.50,
    lastSaleDate: '17/10/25',
    previousOrder: 2,
    isSigned: false,
  },
  {
    id: '6',
    name: 'Dulce de Leche 450g',
    unitsPerPack: 12,
    weeklyAvg: 15,
    salesLast2Weeks: 28,
    salesLast30Days: 62,
    currentStock: 18,
    quantity: 1,
    price: 28.90,
    lastSaleDate: '16/10/25',
    previousOrder: 1,
    isSigned: true,
  },
];

interface ActiveOrderProps {
  onBack?: () => void;
}

export function ActiveOrder({ onBack }: ActiveOrderProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orderStatus, setOrderStatus] = useState<'pending' | 'ordered' | 'received'>('pending');

  const orderDate = '23 de octubre, 2025';
  const supplierName = 'Lácteos La Pradera';

  const handleQuantityChange = (id: string, quantity: number) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, quantity } : p))
    );
  };

  const handlePriceChange = (id: string, price: number) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, price } : p))
    );
  };

  const handleDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalAmount = products.reduce((sum, p) => sum + p.quantity * p.price, 0);

  return (
    <div className="min-h-screen bg-[#E6DDC5] pb-32 md:pb-8">
      {/* Header */}
      <div className="bg-[#F5F5F2] border-b border-[#DAD7CD] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
          {/* Back Button & Title */}
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="ghost" 
              size="icon"
              className="hover:bg-[#E6DDC5]/50 rounded-lg -ml-2"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5 text-[#47685C]" strokeWidth={1.5} />
            </Button>
            <div className="flex-1">
              <h1 className="text-[#1F1F1F] mb-1">Pedido en curso</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#5A8070]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" strokeWidth={1.5} />
                  <span>{orderDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-[#47685C]">{supplierName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Chips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <div className="bg-[#47685C]/5 border border-[#47685C]/20 rounded-lg px-3 py-2.5">
              <p className="text-xs text-[#5A8070] mb-0.5">Total productos</p>
              <p className="text-[#1F1F1F] tabular-nums">{totalProducts}</p>
            </div>
            <div className="bg-[#47685C]/5 border border-[#47685C]/20 rounded-lg px-3 py-2.5">
              <p className="text-xs text-[#5A8070] mb-0.5">Unidades totales</p>
              <p className="text-[#1F1F1F] tabular-nums">{totalUnits}</p>
            </div>
            <div className="bg-[#47685C]/5 border border-[#47685C]/20 rounded-lg px-3 py-2.5">
              <p className="text-xs text-[#5A8070] mb-0.5">Monto estimado</p>
              <p className="text-[#1F1F1F] tabular-nums">${totalAmount.toFixed(2)}</p>
            </div>
            <div className="bg-[#F5F5F2] border border-[#DAD7CD] rounded-lg px-3 py-2.5 flex items-center justify-between">
              <p className="text-xs text-[#5A8070]">Estado</p>
              <StatusChip status={orderStatus} label={
                orderStatus === 'pending' ? 'Pendiente' :
                orderStatus === 'ordered' ? 'Enviado' : 'Recibido'
              } />
            </div>
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              initialQuantity={product.quantity}
              initialPrice={product.price}
              onQuantityChange={handleQuantityChange}
              onPriceChange={handlePriceChange}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#888880]">No hay productos en este pedido</p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#F5F5F2] border-t border-[#DAD7CD] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] z-20 md:left-64">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-xs text-[#5A8070] mb-0.5">Total unidades</p>
              <p className="text-[#1F1F1F] tabular-nums">{totalUnits}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#5A8070] mb-0.5">Total pedido</p>
              <p className="text-[#1F1F1F] tabular-nums">${totalAmount.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1 md:flex-none md:w-auto border-[#C1643B] text-[#C1643B] hover:bg-[#C1643B] hover:text-[#F5F5F2] rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-[#47685C] hover:bg-[#3A5549] text-[#F5F5F2] rounded-lg shadow-sm"
            >
              Confirmar pedido
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
