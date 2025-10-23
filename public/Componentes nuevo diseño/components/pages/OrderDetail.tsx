import { 
  ArrowLeft, 
  Search, 
  X,
  Plus,
  Save,
  MoreVertical,
  Upload,
  Download,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ProductDetailCard } from '../ProductDetailCard';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner@2.0.3';

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
  group?: string;
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
    group: 'Lácteos',
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
    group: 'Lácteos',
  },
  {
    id: '3',
    name: 'Budin de Chocolate',
    unitsPerPack: 8,
    weeklyAvg: 18,
    salesLast2Weeks: 34,
    salesLast30Days: 71,
    currentStock: 6,
    quantity: 0,
    price: 45.20,
    lastSaleDate: '19/10/25',
    previousOrder: 2,
    isSigned: false,
    group: 'Budines',
  },
  {
    id: '4',
    name: 'Budin de Vainilla',
    unitsPerPack: 8,
    weeklyAvg: 15,
    salesLast2Weeks: 28,
    salesLast30Days: 62,
    currentStock: 8,
    quantity: 0,
    price: 43.50,
    lastSaleDate: '21/10/25',
    previousOrder: 1,
    isSigned: false,
    group: 'Budines',
  },
];

interface OrderDetailProps {
  onBack: () => void;
  supplierName?: string;
  dataSource?: string;
}

export function OrderDetail({ 
  onBack, 
  supplierName = 'Cristina',
  dataSource = 'Ventas reales'
}: OrderDetailProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Lácteos', 'Budines']));

  // Calculate totals
  const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalAmount = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilters = activeFilters.length === 0 || activeFilters.every(filter => {
      if (filter === 'Cant. 0') return product.quantity === 0;
      if (filter === 'Sugerido') return product.isSigned;
      if (filter === 'Ped. Ant.') return product.previousOrder > 0;
      return true;
    });
    return matchesSearch && matchesFilters;
  });

  // Group products
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const group = product.group || 'Sin grupo';
    if (!acc[group]) acc[group] = [];
    acc[group].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev =>
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const handleProductUpdate = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    setHasChanges(true);
    
    // Show subtle feedback
    if (updates.quantity !== undefined || updates.price !== undefined) {
      toast.success('Cambios guardados', {
        duration: 1500,
        position: 'top-center',
      });
    }
  };

  const handleSave = () => {
    toast.success('Pedido guardado correctamente', {
      duration: 2000,
      position: 'top-center',
    });
    setHasChanges(false);
  };

  const handleAddProduct = () => {
    toast.info('Agregar producto', {
      duration: 1500,
    });
  };

  return (
    <div className="min-h-screen bg-[#E6DDC5] pb-32">
      {/* Sticky Header */}
      <div className="bg-[#F5F5F2] border-b border-[#DAD7CD] sticky top-0 z-30 backdrop-blur-md bg-[#F5F5F2]/95 shadow-sm">
        <div className="px-4 py-3">
          {/* Top Row: Back + Supplier + Total + Menu */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Button 
                variant="ghost" 
                size="icon"
                className="hover:bg-[#E6DDC5]/50 rounded-lg flex-shrink-0 h-10 w-10"
                onClick={onBack}
              >
                <ArrowLeft className="w-5 h-5 text-[#47685C]" strokeWidth={2} />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[#888880] m-0">Pedido a:</p>
                <h1 className="text-[#1F1F1F] m-0 truncate">{supplierName}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right bg-[#47685C]/5 rounded-lg px-3 py-1.5 min-w-[80px]">
                <p className="text-xs text-[#5A8070] m-0 whitespace-nowrap">Total</p>
                <p className="text-[#47685C] m-0 tabular-nums whitespace-nowrap">${totalAmount.toFixed(2)}</p>
              </div>
              
              {/* More Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-[#E6DDC5]/50 rounded-lg h-10 w-10"
                  >
                    <MoreVertical className="w-5 h-5 text-[#5A8070]" strokeWidth={2} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="gap-2">
                    <Upload className="w-4 h-4" strokeWidth={1.5} />
                    Importar datos
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Download className="w-4 h-4" strokeWidth={1.5} />
                    Exportar pedido
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Copy className="w-4 h-4" strokeWidth={1.5} />
                    Duplicar pedido
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              searchQuery ? 'text-[#47685C]' : 'text-[#888880]'
            }`} strokeWidth={2} />
            <Input
              type="text"
              placeholder="Buscar producto…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 pr-10 h-11 bg-[#FAFAF9] border-[#DAD7CD] focus:border-[#47685C] focus:ring-[#47685C]/20 rounded-xl transition-all ${
                searchQuery ? 'border-[#47685C] ring-1 ring-[#47685C]/10' : ''
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-[#E6DDC5] rounded-lg p-1.5 active:scale-95 transition-transform"
              >
                <X className="w-4 h-4 text-[#888880]" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2">
            {['Cant. 0', 'Sugerido', 'Ped. Ant.'].map((filter) => (
              <Badge
                key={filter}
                variant={activeFilters.includes(filter) ? 'default' : 'outline'}
                className={`cursor-pointer rounded-full transition-all flex-shrink-0 h-8 px-4 ${
                  activeFilters.includes(filter)
                    ? 'bg-[#47685C] text-[#F5F5F2] border-[#47685C] hover:bg-[#3A5549]'
                    : 'bg-[#E6DDC5] border-[#DAD7CD] text-[#5A8070] hover:border-[#47685C]'
                }`}
                onClick={() => toggleFilter(filter)}
              >
                {filter}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="px-4 pt-3 pb-[180px] space-y-3">
        {Object.entries(groupedProducts).map(([groupName, groupProducts]) => {
          const isExpanded = expandedGroups.has(groupName);
          
          return (
            <div key={groupName}>
              {/* Group Header - Sticky */}
              <div className="sticky top-[160px] z-20 bg-[#E6DDC5] mb-3 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between px-4 py-3 active:scale-[0.98] transition-transform"
                >
                <div className="text-left">
                  <h2 className="text-[#47685C] m-0">{groupName}</h2>
                  <p className="text-xs text-[#888880] m-0 mt-0.5">
                    {groupProducts.length} productos
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-[#47685C]" strokeWidth={2} />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#47685C]" strokeWidth={2} />
                )}
                </button>
              </div>

              {/* Products in Group */}
              {isExpanded && (
                <div className="space-y-2.5">
                  {groupProducts.map((product, index) => (
                    <div 
                      key={product.id}
                      style={{ 
                        animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both` 
                      }}
                    >
                      <ProductDetailCard
                        {...product}
                        onQuantityChange={(qty) => handleProductUpdate(product.id, { quantity: qty })}
                        onPriceChange={(price) => handleProductUpdate(product.id, { price })}
                        onStockChange={(stock) => handleProductUpdate(product.id, { currentStock: stock })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-[#F5F5F2] rounded-2xl p-8 max-w-md mx-auto">
              <Search className="w-12 h-12 text-[#DAD7CD] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[#888880] m-0">No se encontraron productos</p>
              <p className="text-sm text-[#A0A09A] m-0 mt-1">Intenta ajustar los filtros</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating "+ Producto" Button */}
      <button
        onClick={handleAddProduct}
        className="fixed right-4 bottom-[140px] z-40 w-12 h-12 rounded-full bg-[#C1643B] hover:bg-[#B85535] shadow-lg shadow-[#C1643B]/30 flex items-center justify-center active:scale-95 transition-all"
        style={{
          boxShadow: '0 4px 16px rgba(193, 100, 59, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
        aria-label="Agregar producto"
      >
        <Plus className="w-5 h-5 text-[#F5F5F2]" strokeWidth={2.5} />
      </button>

      {/* Bottom Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#E6DDC5]/95 backdrop-blur-md border-t border-[#DAD7CD] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] z-30">
        <div className="px-4 py-3">
          {/* Totals Row */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="bg-[#F5F5F2]/60 rounded-xl px-3.5 py-2 flex-1">
              <p className="text-xs text-[#5A8070] m-0 mb-0.5">Total unidades</p>
              <p className="text-[#1F1F1F] m-0 tabular-nums">{totalUnits}</p>
            </div>
            <div className="bg-[#F5F5F2]/60 rounded-xl px-3.5 py-2 flex-1">
              <p className="text-xs text-[#5A8070] m-0 mb-0.5">Total pedido</p>
              <p className="text-[#47685C] m-0 tabular-nums">${totalAmount.toFixed(2)}</p>
            </div>
          </div>
          
          {/* Save Button */}
          <Button
            onClick={handleSave}
            className={`w-full h-11 gap-2 rounded-xl active:scale-[0.98] transition-all ${
              hasChanges 
                ? 'bg-[#47685C] hover:bg-[#3A5549] text-[#F5F5F2] shadow-lg shadow-[#47685C]/20' 
                : 'bg-[#47685C]/40 text-[#F5F5F2]/70 cursor-not-allowed shadow-sm'
            }`}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4" strokeWidth={2} />
            {hasChanges ? 'Guardar cambios' : 'Sin cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
