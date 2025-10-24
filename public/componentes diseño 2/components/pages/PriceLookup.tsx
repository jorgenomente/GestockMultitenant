import { useState, useEffect } from 'react';
import { Search, QrCode, X, ArrowLeft, TrendingUp, TrendingDown, Minus, RefreshCw, MapPin, Clock } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';
import { PriceHistoryMicrochart } from '../PriceHistoryMicrochart';

interface PriceHistoryEntry {
  date: string;
  time?: string;
  price: number;
  supplier: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  salePrice: number;
  purchasePrice: number;
  margin: number;
  mainSupplier: string;
  barcode?: string;
  lastUpdated: string;
  lastUpdatedTime: string;
  priceHistory: PriceHistoryEntry[];
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Leche Entera 1L La Serenísima',
    category: 'Lácteos',
    salePrice: 28.50,
    purchasePrice: 24.50,
    margin: 16.3,
    mainSupplier: 'Cristina',
    barcode: '7790315001234',
    lastUpdated: '17/10/25',
    lastUpdatedTime: '17:32',
    priceHistory: [
      { date: '16/10/25', time: '17:32', price: 28.50, supplier: 'Cristina' },
      { date: '09/10/25', time: '14:20', price: 27.80, supplier: 'Cristina' },
      { date: '02/10/25', time: '16:45', price: 27.00, supplier: 'Cristina' },
    ],
  },
  {
    id: '2',
    name: 'Yogur Natural Ser 500g',
    category: 'Lácteos',
    salePrice: 22.90,
    purchasePrice: 18.75,
    margin: 22.1,
    mainSupplier: 'Cristina',
    barcode: '7790310005678',
    lastUpdated: '20/10/25',
    lastUpdatedTime: '09:15',
    priceHistory: [
      { date: '20/10/25', time: '09:15', price: 22.90, supplier: 'Cristina' },
      { date: '13/10/25', time: '10:30', price: 22.50, supplier: 'Cristina' },
      { date: '06/10/25', time: '11:00', price: 22.00, supplier: 'Cristina' },
    ],
  },
  {
    id: '3',
    name: 'Galletitas Dulces Oreo 118g',
    category: 'Snacks',
    salePrice: 42.00,
    purchasePrice: 32.80,
    margin: 28.0,
    mainSupplier: 'Mayorista Centro',
    barcode: '7622210991287',
    lastUpdated: '22/10/25',
    lastUpdatedTime: '15:45',
    priceHistory: [
      { date: '22/10/25', time: '15:45', price: 42.00, supplier: 'Mayorista Centro' },
      { date: '15/10/25', time: '14:20', price: 40.50, supplier: 'Mayorista Centro' },
      { date: '08/10/25', time: '13:10', price: 39.90, supplier: 'Mayorista Centro' },
    ],
  },
  {
    id: '4',
    name: 'Agua Mineral Villavicencio 2L',
    category: 'Bebidas',
    salePrice: 26.50,
    purchasePrice: 22.50,
    margin: 17.8,
    mainSupplier: 'Distribuidora Norte',
    barcode: '7790070332045',
    lastUpdated: '23/10/25',
    lastUpdatedTime: '08:30',
    priceHistory: [
      { date: '23/10/25', time: '08:30', price: 26.50, supplier: 'Distribuidora Norte' },
      { date: '16/10/25', time: '09:00', price: 26.00, supplier: 'Distribuidora Norte' },
      { date: '09/10/25', time: '08:45', price: 25.50, supplier: 'Distribuidora Norte' },
    ],
  },
  {
    id: '5',
    name: 'Manzanas Rojas Premium 1kg',
    category: 'Frutas',
    salePrice: 55.00,
    purchasePrice: 45.00,
    margin: 22.2,
    mainSupplier: 'Mercado Central',
    lastUpdated: '23/10/25',
    lastUpdatedTime: '06:00',
    priceHistory: [
      { date: '23/10/25', time: '06:00', price: 55.00, supplier: 'Mercado Central' },
      { date: '16/10/25', time: '05:30', price: 52.00, supplier: 'Mercado Central' },
      { date: '09/10/25', time: '06:15', price: 48.00, supplier: 'Mercado Central' },
    ],
  },
  {
    id: '6',
    name: 'Papas Fritas Lays Clásicas 165g',
    category: 'Snacks',
    salePrice: 35.00,
    purchasePrice: 28.50,
    margin: 22.9,
    mainSupplier: 'Mayorista Centro',
    barcode: '7790310982341',
    lastUpdated: '23/10/25',
    lastUpdatedTime: '15:45',
    priceHistory: [
      { date: '23/10/25', time: '15:45', price: 35.00, supplier: 'Mayorista Centro' },
      { date: '16/10/25', time: '14:30', price: 34.50, supplier: 'Mayorista Centro' },
      { date: '09/10/25', time: '13:00', price: 33.90, supplier: 'Mayorista Centro' },
    ],
  },
  {
    id: '7',
    name: 'Lechuga Criolla Fresca',
    category: 'Verduras',
    salePrice: 45.00,
    purchasePrice: 38.00,
    margin: 18.4,
    mainSupplier: 'Huerta del Valle',
    lastUpdated: '22/10/25',
    lastUpdatedTime: '07:15',
    priceHistory: [
      { date: '22/10/25', time: '07:15', price: 45.00, supplier: 'Huerta del Valle' },
      { date: '15/10/25', time: '07:00', price: 42.00, supplier: 'Huerta del Valle' },
      { date: '08/10/25', time: '07:30', price: 40.00, supplier: 'Huerta del Valle' },
    ],
  },
  {
    id: '8',
    name: 'Gaseosa Coca Cola 2.25L',
    category: 'Bebidas',
    salePrice: 48.00,
    purchasePrice: 38.90,
    margin: 23.4,
    mainSupplier: 'Distribuidora Norte',
    barcode: '7790895001123',
    lastUpdated: '23/10/25',
    lastUpdatedTime: '08:30',
    priceHistory: [
      { date: '23/10/25', time: '08:30', price: 48.00, supplier: 'Distribuidora Norte' },
      { date: '16/10/25', time: '09:15', price: 47.50, supplier: 'Distribuidora Norte' },
      { date: '09/10/25', time: '08:50', price: 46.90, supplier: 'Distribuidora Norte' },
    ],
  },
  {
    id: '9',
    name: 'Budin de Chocolate Bimbo',
    category: 'Budines',
    salePrice: 52.00,
    purchasePrice: 45.20,
    margin: 15.0,
    mainSupplier: 'Cristina',
    barcode: '7500193821345',
    lastUpdated: '19/10/25',
    lastUpdatedTime: '16:00',
    priceHistory: [
      { date: '19/10/25', time: '16:00', price: 52.00, supplier: 'Cristina' },
      { date: '12/10/25', time: '15:45', price: 51.50, supplier: 'Cristina' },
      { date: '05/10/25', time: '16:20', price: 50.90, supplier: 'Cristina' },
    ],
  },
  {
    id: '10',
    name: 'Queso Cremoso Ilolay 200g',
    category: 'Lácteos',
    salePrice: 38.50,
    purchasePrice: 32.00,
    margin: 20.3,
    mainSupplier: 'Cristina',
    barcode: '7790315990234',
    lastUpdated: '20/10/25',
    lastUpdatedTime: '09:15',
    priceHistory: [
      { date: '20/10/25', time: '09:15', price: 38.50, supplier: 'Cristina' },
      { date: '13/10/25', time: '10:00', price: 37.90, supplier: 'Cristina' },
      { date: '06/10/25', time: '09:30', price: 37.00, supplier: 'Cristina' },
    ],
  },
];

// Category color mapping - stripe colors
const categoryColors: Record<string, { stripe: string; text: string }> = {
  'Lácteos': { stripe: '#DCE8DF', text: '#47685C' },
  'Snacks': { stripe: '#F2E4D2', text: '#8B6B3A' },
  'Dulces': { stripe: '#F2E4D2', text: '#8B6B3A' },
  'Budines': { stripe: '#F2E4D2', text: '#8B6B3A' },
  'Verduras': { stripe: '#E3EAE0', text: '#5A8070' },
  'Frutas': { stripe: '#E3EAE0', text: '#5A8070' },
  'Bebidas': { stripe: '#E2E8E7', text: '#2C4653' },
};

const defaultCategory = { stripe: '#EEEAE3', text: '#5A8070' };

type UserRole = 'staff' | 'supervisor' | 'admin';

interface PriceLookupProps {
  onBack: () => void;
  userRole?: UserRole;
  branchName?: string;
}

export function PriceLookup({ 
  onBack, 
  userRole = 'admin',
  branchName = 'Caballito'
}: PriceLookupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(mockProducts);
  const [lastDataUpdate, setLastDataUpdate] = useState({
    date: '23/10/2025',
    time: '17:32h',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Role permissions
  const canViewExtendedInfo = userRole === 'admin' || userRole === 'supervisor';

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() === '') {
        setFilteredProducts(mockProducts);
      } else {
        const query = searchQuery.toLowerCase();
        const filtered = mockProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query) ||
            p.barcode?.includes(query) ||
            p.mainSupplier.toLowerCase().includes(query)
        );
        setFilteredProducts(filtered);
        
        // Add to recent searches if not empty and not already in list
        if (query.length > 2 && !recentSearches.includes(query)) {
          setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getMarginColor = (margin: number) => {
    if (margin > 30) return { bg: '#7DAA92', text: '#F5F5F2' };
    if (margin >= 10) return { bg: '#D1A45C', text: '#F5F5F2' };
    return { bg: '#C68A6A', text: '#F5F5F2' }; // Soft Copper for low margins
  };

  const getPriceChange = (history: PriceHistoryEntry[]) => {
    if (history.length < 2) return 0;
    return history[0].price - history[1].price;
  };

  const handleScanBarcode = () => {
    // Simulate barcode scan
    const randomProduct = mockProducts[Math.floor(Math.random() * mockProducts.length)];
    setSearchQuery(randomProduct.name);
    toast.success('Código escaneado', {
      duration: 1500,
      position: 'top-center',
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Simulate data refresh
    setTimeout(() => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'h';
      
      setLastDataUpdate({
        date: dateStr,
        time: timeStr,
      });
      
      setIsRefreshing(false);
      toast.success('Precios actualizados', {
        duration: 2000,
        position: 'top-center',
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#E6DDC5] pb-24" style={{ animation: 'slideUp 0.3s ease-out' }}>
      {/* Header */}
      <div className="bg-[#F5F5F2] border-b border-[#E9E3D0] sticky top-0 z-30 backdrop-blur-md bg-[#F5F5F2]/95 shadow-sm">
        <div className="px-4 py-3">
          {/* Top Row: Back + Title + Branch */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button 
                variant="ghost" 
                size="icon"
                className="hover:bg-[#E9E3D0]/50 rounded-lg flex-shrink-0 h-10 w-10"
                onClick={onBack}
              >
                <ArrowLeft className="w-5 h-5 text-[#2C3A33]" strokeWidth={2} />
              </Button>
              <div className="min-w-0">
                <h1 className="text-[#2C3A33] m-0 leading-tight" style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}>
                  Consulta de Precios
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3 text-[#7DAA92]" strokeWidth={2} />
                  <p className="text-[10px] text-[#7DAA92] m-0" style={{ fontFamily: 'var(--font-family-mono)' }}>
                    Actualizado: {lastDataUpdate.date} · {lastDataUpdate.time}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Branch Badge */}
            <Badge 
              variant="outline" 
              className="flex-shrink-0 bg-[#E9E3D0] border-[#E9E3D0] text-[#2C3A33] text-xs px-2.5 py-1 gap-1"
            >
              <MapPin className="w-3 h-3" strokeWidth={2} />
              {branchName}
            </Badge>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors z-10 ${
              searchQuery ? 'text-[#7DAA92]' : 'text-[#2C3A33]'
            }`} style={{ opacity: searchQuery ? 1 : 0.5 }} strokeWidth={2} />
            <Input
              type="text"
              placeholder="Buscar producto, categoría o código…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 pr-28 h-12 bg-[#FAFAF9] border-[#E9E3D0] focus:border-[#7DAA92] focus:ring-[#7DAA92]/20 rounded-xl transition-all ${
                searchQuery ? 'border-[#7DAA92] ring-2 ring-[#7DAA92]/10' : ''
              }`}
              style={{ color: '#2C3A33' }}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:bg-[#E9E3D0] rounded-lg p-1.5 active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4 text-[#2C3A33]" style={{ opacity: 0.6 }} strokeWidth={2} />
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`hover:bg-[#E9E3D0] rounded-lg p-2 active:scale-95 transition-all ${
                  isRefreshing ? 'opacity-50' : ''
                }`}
                title="Recargar precios"
              >
                <RefreshCw className={`w-4 h-4 text-[#2C3A33] ${
                  isRefreshing ? 'animate-spin' : ''
                }`} strokeWidth={2} />
              </button>
              <button
                onClick={handleScanBarcode}
                className="gestock-btn-moss rounded-lg p-2"
              >
                <QrCode className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Recent Searches */}
          {searchQuery === '' && recentSearches.length > 0 && (
            <div>
              <p className="text-xs text-[#888880] mb-2" style={{ fontFamily: 'var(--font-family-mono)' }}>
                BÚSQUEDAS RECIENTES
              </p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSearchQuery(search)}
                    className="text-xs bg-[#E6DDC5] hover:bg-[#DAD7CD] text-[#5A8070] px-3 py-1.5 rounded-full border border-[#DAD7CD] active:scale-95 transition-all"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 pt-4 space-y-2.5">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product, index) => {
            const isExpanded = expandedCard === product.id;
            const categoryTheme = categoryColors[product.category] || defaultCategory;
            const marginColor = getMarginColor(product.margin);
            const priceChange = getPriceChange(product.priceHistory);

            return (
              <div
                key={product.id}
                className={`rounded-xl border transition-all duration-200 relative overflow-hidden group ${
                  isExpanded ? 'shadow-[0_4px_12px_rgba(0,0,0,0.08)] border-[#7DAA92]' : 'shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#7DAA92]'
                }`}
                style={{
                  backgroundColor: '#F5F5F2',
                  borderColor: isExpanded ? '#7DAA92' : '#E9E3D0',
                  borderWidth: isExpanded ? '1.5px' : '1px',
                  animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
                }}
              >
                {/* Category Stripe */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: categoryTheme.stripe }}
                />
                
                {/* Card Header */}
                <button
                  onClick={() => setExpandedCard(isExpanded ? null : product.id)}
                  className="w-full text-left p-4 pl-5 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      {/* Category Tag */}
                      <div
                        className="inline-block text-[9px] uppercase tracking-wider mb-1.5 px-1.5 py-0.5 rounded"
                        style={{
                          fontFamily: 'var(--font-family-mono)',
                          fontWeight: 500,
                          color: categoryTheme.text,
                          backgroundColor: `${categoryTheme.text}15`,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {product.category}
                      </div>

                      {/* Product Name */}
                      <h3
                        className="text-sm m-0 mb-2 leading-tight"
                        style={{ color: '#2C3A33', fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}
                      >
                        {product.name}
                      </h3>

                      {/* Sale Price & Margin - Always Visible */}
                      <div className="flex items-baseline gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-[10px] m-0 mb-0.5" style={{ color: 'rgba(31, 31, 31, 0.7)' }}>Precio venta</p>
                          <p
                            className="text-[26px] m-0 tabular-nums leading-none"
                            style={{ color: '#C1643B', fontFamily: 'var(--font-family-heading)', fontWeight: 700 }}
                          >
                            ${product.salePrice.toFixed(2)}
                          </p>
                        </div>
                        {canViewExtendedInfo && (
                          <Badge
                            className="text-[10px] px-2 py-0.5 rounded-md border-0 self-start mt-5 opacity-60"
                            style={{
                              backgroundColor: marginColor.bg,
                              color: marginColor.text,
                              fontFamily: 'var(--font-family-mono)',
                              fontWeight: 600,
                            }}
                          >
                            {product.margin.toFixed(1)}%
                          </Badge>
                        )}
                      </div>

                      {/* Last Updated - Always Visible */}
                      <div className="flex items-center gap-1 mb-2">
                        <Clock className="w-3 h-3" style={{ color: 'rgba(31, 31, 31, 0.5)' }} strokeWidth={1.5} />
                        <span className="text-[10px]" style={{ fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 31, 31, 0.7)' }}>
                          {product.lastUpdated} · {product.lastUpdatedTime}
                        </span>
                      </div>

                      {/* Extended Info - Role-Based */}
                      {canViewExtendedInfo && (
                        <div className="flex items-center gap-3 flex-wrap">
                          <div>
                            <p className="text-[10px] m-0 mb-0.5" style={{ color: 'rgba(31, 31, 31, 0.6)' }}>Compra prom.</p>
                            <p
                              className="text-sm m-0 tabular-nums"
                              style={{ fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 31, 31, 0.8)' }}
                            >
                              ${product.purchasePrice.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px]" style={{ color: 'rgba(31, 31, 31, 0.5)' }}>•</span>
                            <span className="text-[10px]" style={{ color: 'rgba(31, 31, 31, 0.6)' }}>{product.mainSupplier}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price Trend Indicator */}
                    {priceChange !== 0 && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0 ${
                        priceChange > 0 ? 'bg-[#C1643B]/15' : 'bg-[#7DAA92]/15'
                      }`}>
                        {priceChange > 0 ? (
                          <TrendingUp className="w-3 h-3 text-[#C1643B]" strokeWidth={2} />
                        ) : priceChange < 0 ? (
                          <TrendingDown className="w-3 h-3 text-[#7DAA92]" strokeWidth={2} />
                        ) : (
                          <Minus className="w-3 h-3 text-[#888880]" strokeWidth={2} />
                        )}
                        <span className={`text-[10px] tabular-nums ${
                          priceChange > 0 ? 'text-[#C1643B]' : 'text-[#7DAA92]'
                        }`} style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>
                          {priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </button>

                {/* Expanded: Price History */}
                {isExpanded && (
                  <div
                    className="border-t px-4 pb-4 pt-3 pl-5"
                    style={{
                      animation: 'expandDown 0.2s ease-out',
                      backgroundColor: '#FAFAF9',
                      borderTopColor: '#E9E3D0',
                    }}
                  >
                    {/* Microchart - Role-Based Visibility */}
                    {canViewExtendedInfo && product.priceHistory.length >= 2 && (
                      <div className="mb-4 pb-3 border-b border-[#E9E3D0]">
                        <p
                          className="text-[10px] mb-2 uppercase tracking-wide"
                          style={{ fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 31, 31, 0.5)' }}
                        >
                          Evolución de precio
                        </p>
                        <div className="flex justify-center">
                          <PriceHistoryMicrochart 
                            data={product.priceHistory} 
                            width={280}
                            height={60}
                          />
                        </div>
                      </div>
                    )}

                    <p
                      className="text-[10px] mb-2.5 uppercase tracking-wide"
                      style={{ fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 31, 31, 0.5)' }}
                    >
                      Historial detallado
                    </p>
                    <div className="space-y-2">
                      {product.priceHistory.map((entry, idx) => {
                        const prevPrice = idx < product.priceHistory.length - 1 ? product.priceHistory[idx + 1].price : entry.price;
                        const delta = entry.price - prevPrice;
                        
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 bg-[#F5F5F2] rounded-lg border border-[#E9E3D0]"
                          >
                            <div className="flex-1">
                              <p className="text-xs m-0" style={{ fontFamily: 'var(--font-family-mono)', color: 'rgba(31, 31, 31, 0.8)' }}>
                                {entry.date} · {entry.time}
                              </p>
                              {canViewExtendedInfo && (
                                <p className="text-[10px] m-0 mt-0.5" style={{ color: 'rgba(31, 31, 31, 0.6)' }}>{entry.supplier}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p
                                className="text-base m-0 tabular-nums"
                                style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 600, color: '#1F1F1F' }}
                              >
                                ${entry.price.toFixed(2)}
                              </p>
                              {delta !== 0 && (
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  {delta > 0 ? (
                                    <TrendingUp className="w-3 h-3 text-[#C1643B]" strokeWidth={2} />
                                  ) : (
                                    <TrendingDown className="w-3 h-3 text-[#7DAA92]" strokeWidth={2} />
                                  )}
                                  <p
                                    className={`text-[10px] m-0 tabular-nums ${
                                      delta > 0 ? 'text-[#C1643B]' : 'text-[#7DAA92]'
                                    }`}
                                    style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}
                                  >
                                    {delta > 0 ? '+' : ''}${delta.toFixed(2)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-20">
            <div className="bg-[#F5F5F2] rounded-2xl p-8 max-w-md mx-auto border border-[#DAD7CD]/50">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#E6DDC5] rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-[#888880]" strokeWidth={1.5} />
              </div>
              <p className="text-[#2C4653] m-0 mb-2" style={{ fontFamily: 'var(--font-family-heading)', fontWeight: 600 }}>
                No se encontraron productos
              </p>
              <p className="text-sm text-[#888880] m-0">
                Intenta con otro término de búsqueda
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
