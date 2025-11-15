import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Input } from './ui/input';
import { ProductGroup as ProductGroupType, Product } from '../App';
import { ProductCard } from './ProductCard';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';

interface ProductGroupsProps {
  groups: ProductGroupType[];
  onProductUpdate: (groupId: string, productId: string, field: keyof Product, value: any) => void;
  onRemoveProduct: (groupId: string, productId: string) => void;
  onViewStats?: (product: Product) => void;
}

export function ProductGroups({
  groups,
  onProductUpdate,
  onRemoveProduct,
  onViewStats,
}: ProductGroupsProps) {
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});

  const getFilteredProducts = (groupId: string, products: Product[]) => {
    const searchTerm = searchTerms[groupId] || '';
    if (!searchTerm) return products;
    
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const calculateGroupTotal = (products: Product[]) => {
    return products.reduce((total, product) => {
      return total + (product.price * product.orderQuantity);
    }, 0);
  };

  const calculateGroupStats = (products: Product[]) => {
    const total = products.reduce((sum, p) => sum + (p.price * p.orderQuantity), 0);
    const avgPrice = products.length > 0 
      ? products.reduce((sum, p) => sum + p.price, 0) / products.length 
      : 0;
    const initialStock = products.reduce((sum, p) => sum + p.currentStock, 0);
    const finalStock = products.reduce((sum, p) => sum + p.finalStock, 0);
    const stockVariation = initialStock > 0 
      ? ((finalStock - initialStock) / initialStock) * 100 
      : 0;

    return { total, avgPrice, initialStock, finalStock, stockVariation };
  };

  return (
    <div className="space-y-4">
      <h2 className="text-[#0E2E2B]">Listado de productos</h2>

      <Accordion type="multiple" defaultValue={groups.map(g => g.id)} className="space-y-4">
        {groups.map((group) => {
          const filteredProducts = getFilteredProducts(group.id, group.products);
          const groupStats = calculateGroupStats(group.products);

          return (
            <AccordionItem
              key={group.id}
              value={group.id}
              className="bg-white rounded-[16px] shadow-sm border-0"
            >
              <AccordionTrigger className="px-6 py-5 hover:no-underline hover:bg-[#F9FAF9] rounded-t-[16px] [&[data-state=closed]]:rounded-[16px] transition-colors group">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[#0E2E2B]">{group.name}</h3>
                      <ChevronDown className="w-5 h-5 text-[#6B7280] transition-transform group-data-[state=open]:rotate-180" />
                    </div>
                    <span className="text-sm text-[#6B7280]">
                      {group.products.length} {group.products.length === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>
                  <div className="text-[#27AE60]">
                    ${groupStats.total.toLocaleString('es-ES')}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-6 pb-6">
                {/* Search Bar */}
                <div className="mb-5 pt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                    <Input
                      placeholder="Buscar producto..."
                      value={searchTerms[group.id] || ''}
                      onChange={(e) => setSearchTerms({ ...searchTerms, [group.id]: e.target.value })}
                      className="pl-10 border-[#EAEAEA] focus:border-[#27AE60] focus:ring-[#27AE60]"
                    />
                  </div>
                </div>

                {/* Product Cards Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        groupId={group.id}
                        onUpdate={onProductUpdate}
                        onRemove={onRemoveProduct}
                        onViewStats={onViewStats}
                      />
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-[#6B7280]">
                      No se encontraron productos
                    </div>
                  )}
                </div>

                {/* Group Subtotal */}
                <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex items-center justify-between">
                  <span className="text-[#6B7280]">Subtotal grupo</span>
                  <span className="text-[#27AE60]">
                    ${groupStats.total.toLocaleString('es-ES')}
                  </span>
                </div>

                {/* Group Mini Stats */}
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-[#6B7280]">
                  <div>
                    <p className="mb-1">Precio promedio</p>
                    <p className="text-[#0E2E2B]">${groupStats.avgPrice.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="mb-1">Stock inicial</p>
                    <p className="text-[#0E2E2B]">{groupStats.initialStock}</p>
                  </div>
                  <div>
                    <p className="mb-1">Stock final</p>
                    <p className="text-[#0E2E2B]">{groupStats.finalStock}</p>
                  </div>
                  <div>
                    <p className="mb-1">Variación stock</p>
                    <p className={groupStats.stockVariation >= 0 ? 'text-[#27AE60]' : 'text-[#EF4444]'}>
                      {groupStats.stockVariation >= 0 ? '+' : ''}{groupStats.stockVariation.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}