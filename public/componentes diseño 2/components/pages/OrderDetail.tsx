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
  Grid3x3,
  SortAsc
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { CompactProductCard } from '../CompactProductCard';
import { useState, useEffect, useRef } from 'react';
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
  {
    id: '5',
    name: 'Galletitas Dulces Mix',
    unitsPerPack: 20,
    weeklyAvg: 38,
    salesLast2Weeks: 74,
    salesLast30Days: 152,
    currentStock: 22,
    quantity: 2,
    price: 32.80,
    lastSaleDate: '22/10/25',
    previousOrder: 2,
    isSigned: true,
    group: 'Snacks',
  },
  {
    id: '6',
    name: 'Papas Fritas Clásicas',
    unitsPerPack: 24,
    weeklyAvg: 42,
    salesLast2Weeks: 85,
    salesLast30Days: 168,
    currentStock: 18,
    quantity: 1,
    price: 28.50,
    lastSaleDate: '23/10/25',
    previousOrder: 2,
    isSigned: false,
    group: 'Snacks',
  },
  {
    id: '7',
    name: 'Manzanas Rojas 1kg',
    unitsPerPack: 10,
    weeklyAvg: 25,
    salesLast2Weeks: 48,
    salesLast30Days: 102,
    currentStock: 12,
    quantity: 3,
    price: 45.00,
    lastSaleDate: '23/10/25',
    previousOrder: 3,
    isSigned: true,
    group: 'Frutas',
  },
  {
    id: '8',
    name: 'Lechuga Criolla',
    unitsPerPack: 12,
    weeklyAvg: 18,
    salesLast2Weeks: 35,
    salesLast30Days: 72,
    currentStock: 8,
    quantity: 2,
    price: 38.00,
    lastSaleDate: '22/10/25',
    previousOrder: 2,
    isSigned: true,
    group: 'Verduras',
  },
  {
    id: '9',
    name: 'Agua Mineral 2L',
    unitsPerPack: 12,
    weeklyAvg: 55,
    salesLast2Weeks: 108,
    salesLast30Days: 220,
    currentStock: 30,
    quantity: 4,
    price: 22.50,
    lastSaleDate: '23/10/25',
    previousOrder: 4,
    isSigned: true,
    group: 'Bebidas',
  },
  {
    id: '10',
    name: 'Gaseosa Cola 2.25L',
    unitsPerPack: 8,
    weeklyAvg: 32,
    salesLast2Weeks: 64,
    salesLast30Days: 128,
    currentStock: 16,
    quantity: 2,
    price: 38.90,
    lastSaleDate: '23/10/25',
    previousOrder: 2,
    isSigned: false,
    group: 'Bebidas',
  },
];

type ViewMode = 'category' | 'alphabetical';

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
  const [viewMode, setViewMode] = useState<ViewMode>('category');
  const scrollPositionRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Organize products based on view mode
  const organizedProducts = (() => {
    if (viewMode === 'alphabetical') {
      // Sort alphabetically
      return [...filteredProducts].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Group by category
      const grouped = filteredProducts.reduce((acc, product) => {
        const group = product.group || 'Sin grupo';
        if (!acc[group]) acc[group] = [];
        acc[group].push(product);
        return acc;
      }, {} as Record<string, Product[]>);
      return grouped;
    }
  })();

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev =>
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
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

  const handleViewModeChange = (mode: ViewMode) => {
    // Save scroll position
    if (containerRef.current) {
      scrollPositionRef.current = containerRef.current.scrollTop;
    }
    
    setViewMode(mode);
    
    // Restore scroll position after a short delay
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = scrollPositionRef.current;
      }
    }, 50);
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
              {/* Total Badge */}
              <div className="bg-[#47685C] text-[#F5F5F2] px-3 py-1.5 rounded-lg">
                <p className="text-[10px] m-0 opacity-90">Total</p>
                <p className="text-sm m-0 tabular-nums" style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}>
                  ${totalAmount.toFixed(2)}
                </p>
              </div>
              
              {/* More Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-[#E6DDC5]/50">
                    <MoreVertical className="w-5 h-5 text-[#47685C]" strokeWidth={2} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleAddProduct}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar producto
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar lista
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar pedido
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar pedido
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Data Source Tag */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-[#5A8070]">Fuente:</span>
            <Badge variant="outline" className="bg-[#A9C9A4]/15 border-[#A9C9A4]/30 text-[#47685C] text-xs">
              {dataSource}
            </Badge>
          </div>
        </div>

        {/* View Toggle - Segmented Control */}
        <div className="px-4 pb-3">
          <div className="bg-[#E6DDC5] rounded-xl p-1 flex gap-1">
            <button
              onClick={() => handleViewModeChange('category')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg ${
                viewMode === 'category'
                  ? 'gestock-btn-moss'
                  : 'bg-transparent text-[#5A8070] hover:bg-[#DAD7CD]/50 transition-all'
              }`}
            >
              <Grid3x3 className="w-4 h-4" strokeWidth={2} />
              <span className="text-sm" style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}>
                Categorías
              </span>
            </button>
            <button
              onClick={() => handleViewModeChange('alphabetical')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg ${
                viewMode === 'alphabetical'
                  ? 'gestock-btn-moss'
                  : 'bg-transparent text-[#5A8070] hover:bg-[#DAD7CD]/50 transition-all'
              }`}
            >
              <SortAsc className="w-4 h-4" strokeWidth={2} />
              <span className="text-sm" style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}>
                A–Z
              </span>
            </button>
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
      <div ref={containerRef} className="px-4 pt-3 pb-[180px] space-y-2 overflow-y-auto">
        {viewMode === 'category' ? (
          // Category View
          <>
            {Object.entries(organizedProducts as Record<string, Product[]>).map(([groupName, groupProducts]) => (
              <div 
                key={groupName}
                className="space-y-2"
                style={{ animation: 'fadeIn 0.3s ease-out' }}
              >
                {/* Category Header */}
                <div className="sticky top-0 z-20 bg-[#E6DDC5] pt-2 pb-2">
                  <div className="flex items-center justify-between px-3 py-2 bg-[#F5F5F2] rounded-lg border border-[#DAD7CD]/50">
                    <h2 className="text-sm text-[#47685C] m-0" style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}>
                      {groupName}
                    </h2>
                    <span className="text-xs text-[#888880]" style={{ fontFamily: 'var(--font-family-mono)' }}>
                      {groupProducts.length} productos
                    </span>
                  </div>
                </div>

                {/* Products in Group */}
                <div className="space-y-2">
                  {groupProducts.map((product, index) => (
                    <div 
                      key={product.id}
                      style={{ 
                        animation: `fadeInUp 0.3s ease-out ${index * 0.03}s both` 
                      }}
                    >
                      <CompactProductCard
                        {...product}
                        onQuantityChange={(qty) => handleProductUpdate(product.id, { quantity: qty })}
                        onPriceChange={(price) => handleProductUpdate(product.id, { price })}
                        onStockChange={(stock) => handleProductUpdate(product.id, { currentStock: stock })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          // Alphabetical View
          <div className="space-y-2">
            {(organizedProducts as Product[]).map((product, index) => (
              <div 
                key={product.id}
                style={{ 
                  animation: `fadeInUp 0.3s ease-out ${index * 0.02}s both` 
                }}
              >
                <CompactProductCard
                  {...product}
                  onQuantityChange={(qty) => handleProductUpdate(product.id, { quantity: qty })}
                  onPriceChange={(price) => handleProductUpdate(product.id, { price })}
                  onStockChange={(stock) => handleProductUpdate(product.id, { currentStock: stock })}
                />
              </div>
            ))}
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-[#F5F5F2] rounded-2xl p-8 max-w-md mx-auto">
              <p className="text-[#888880] m-0">
                No se encontraron productos
              </p>
              <p className="text-sm text-[#888880] m-0 mt-2">
                Intenta cambiar los filtros o la búsqueda
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#F5F5F2] border-t border-[#DAD7CD] px-4 py-3 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        {/* Summary Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-[#888880] m-0">Total unidades</p>
              <p className="text-base text-[#1F1F1F] m-0 tabular-nums" style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}>
                {totalUnits}
              </p>
            </div>
            <div className="w-px h-10 bg-[#DAD7CD]"></div>
            <div>
              <p className="text-xs text-[#888880] m-0">Productos con cant.</p>
              <p className="text-base text-[#1F1F1F] m-0 tabular-nums" style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}>
                {products.filter(p => p.quantity > 0).length}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-[#888880] m-0">Total a pagar</p>
            <p className="text-lg text-[#47685C] m-0 tabular-nums" style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 700 }}>
              ${totalAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 h-12 gap-2 rounded-xl border-[#DAD7CD] hover:border-[#47685C] hover:bg-[#47685C]/5 text-[#47685C]"
            onClick={() => {
              toast.info('Exportar pedido', {
                duration: 1500,
              });
            }}
          >
            <Download className="w-4 h-4" strokeWidth={2} />
            <span>Exportar</span>
          </Button>
          <Button 
            className={`flex-1 h-12 gap-2 rounded-xl ${
              hasChanges 
                ? 'gestock-btn-moss' 
                : 'gestock-btn-neutral'
            }`}
            onClick={handleSave}
          >
            <Save className="w-4 h-4" strokeWidth={2} />
            <span>{hasChanges ? 'Guardar cambios' : 'Guardado'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
