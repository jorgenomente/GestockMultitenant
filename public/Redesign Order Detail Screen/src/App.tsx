import { useState } from 'react';
import { CompactHeader } from './components/CompactHeader';
import { NotesLog, Note } from './components/NotesLog';
import { EnhancedProductGroup } from './components/EnhancedProductGroup';
import { StickyActionBar } from './components/StickyActionBar';
import { ProductStatsModal } from './components/ProductStatsModal';
import { UpdateStockModal } from './components/UpdateStockModal';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';

export interface Product {
  id: string;
  name: string;
  price: number;
  currentStock: number;
  finalStock: number;
  orderQuantity: number;
  sales?: {
    last7Days: number;
    weekAvg: number;
    last15Days: number;
    last30Days: number;
    trend: 'up' | 'down' | 'stable';
    dailySales?: { date: string; units: number }[];
  };
}

export interface ProductGroup {
  id: string;
  name: string;
  products: Product[];
}

export default function App() {
  const [orderData, setOrderData] = useState({
    supplier: 'Distribuidora El Sol',
    frequency: 'Semanal',
    dataSource: 'ventas 7.11.xlsx',
    status: 'Pendiente' as 'Pendiente' | 'Realizado',
    date: '08/11/2025',
    lastStockUpdate: '03/11/2025, 09:03 a.m.',
  });

  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      content: 'Verificar stock de budines antes de confirmar el pedido',
      timestamp: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      author: 'Ana García',
      isResolved: false,
    },
    {
      id: '2',
      content: 'Proveedor confirmó disponibilidad de todos los productos',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      author: 'Carlos López',
      isResolved: true,
    },
  ]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isUpdateStockModalOpen, setIsUpdateStockModalOpen] = useState(false);

  const [productGroups, setProductGroups] = useState<ProductGroup[]>([
    {
      id: 'group-1',
      name: 'Budines',
      products: [
        { 
          id: '1', 
          name: 'Budín de Limón 500g', 
          price: 2850, 
          currentStock: 12, 
          finalStock: 8, 
          orderQuantity: 8,
          sales: {
            last7Days: 14,
            weekAvg: 11,
            last15Days: 22,
            last30Days: 45,
            trend: 'up',
            dailySales: [
              { date: '09/10', units: 1 }, { date: '10/10', units: 2 }, { date: '11/10', units: 1 },
              { date: '12/10', units: 2 }, { date: '13/10', units: 1 }, { date: '14/10', units: 2 },
              { date: '15/10', units: 1 }, { date: '16/10', units: 2 }, { date: '17/10', units: 1 },
              { date: '18/10', units: 2 }, { date: '19/10', units: 1 }, { date: '20/10', units: 2 },
              { date: '21/10', units: 1 }, { date: '22/10', units: 2 }, { date: '23/10', units: 2 },
              { date: '24/10', units: 1 }, { date: '25/10', units: 2 }, { date: '26/10', units: 2 },
              { date: '27/10', units: 2 }, { date: '28/10', units: 1 }, { date: '29/10', units: 2 },
              { date: '30/10', units: 2 }, { date: '31/10', units: 2 }, { date: '01/11', units: 2 },
              { date: '02/11', units: 2 }, { date: '03/11', units: 2 }, { date: '04/11', units: 2 },
              { date: '05/11', units: 2 }, { date: '06/11', units: 2 }, { date: '07/11', units: 2 },
            ],
          },
        },
        { 
          id: '2', 
          name: 'Budín de Vainilla 500g', 
          price: 2850, 
          currentStock: 15, 
          finalStock: 10, 
          orderQuantity: 10,
          sales: {
            last7Days: 12,
            weekAvg: 10,
            last15Days: 20,
            last30Days: 42,
            trend: 'stable',
            dailySales: [
              { date: '09/10', units: 1 }, { date: '10/10', units: 1 }, { date: '11/10', units: 2 },
              { date: '12/10', units: 1 }, { date: '13/10', units: 2 }, { date: '14/10', units: 1 },
              { date: '15/10', units: 2 }, { date: '16/10', units: 1 }, { date: '17/10', units: 1 },
              { date: '18/10', units: 2 }, { date: '19/10', units: 1 }, { date: '20/10', units: 1 },
              { date: '21/10', units: 2 }, { date: '22/10', units: 1 }, { date: '23/10', units: 2 },
              { date: '24/10', units: 1 }, { date: '25/10', units: 1 }, { date: '26/10', units: 2 },
              { date: '27/10', units: 1 }, { date: '28/10', units: 2 }, { date: '29/10', units: 1 },
              { date: '30/10', units: 2 }, { date: '31/10', units: 1 }, { date: '01/11', units: 1 },
              { date: '02/11', units: 2 }, { date: '03/11', units: 1 }, { date: '04/11', units: 2 },
              { date: '05/11', units: 1 }, { date: '06/11', units: 2 }, { date: '07/11', units: 1 },
            ],
          },
        },
        { 
          id: '3', 
          name: 'Budín Marmolado 500g', 
          price: 2950, 
          currentStock: 8, 
          finalStock: 6, 
          orderQuantity: 12,
          sales: {
            last7Days: 18,
            weekAvg: 14,
            last15Days: 28,
            last30Days: 56,
            trend: 'up',
            dailySales: [
              { date: '09/10', units: 2 }, { date: '10/10', units: 2 }, { date: '11/10', units: 1 },
              { date: '12/10', units: 2 }, { date: '13/10', units: 2 }, { date: '14/10', units: 2 },
              { date: '15/10', units: 1 }, { date: '16/10', units: 2 }, { date: '17/10', units: 2 },
              { date: '18/10', units: 2 }, { date: '19/10', units: 1 }, { date: '20/10', units: 2 },
              { date: '21/10', units: 2 }, { date: '22/10', units: 2 }, { date: '23/10', units: 2 },
              { date: '24/10', units: 2 }, { date: '25/10', units: 2 }, { date: '26/10', units: 2 },
              { date: '27/10', units: 2 }, { date: '28/10', units: 2 }, { date: '29/10', units: 2 },
              { date: '30/10', units: 2 }, { date: '31/10', units: 2 }, { date: '01/11', units: 2 },
              { date: '02/11', units: 3 }, { date: '03/11', units: 2 }, { date: '04/11', units: 3 },
              { date: '05/11', units: 2 }, { date: '06/11', units: 3 }, { date: '07/11', units: 2 },
            ],
          },
        },
        { 
          id: '4', 
          name: 'Budín de Chocolate 500g', 
          price: 3100, 
          currentStock: 10, 
          finalStock: 5, 
          orderQuantity: 15,
          sales: {
            last7Days: 22,
            weekAvg: 18,
            last15Days: 36,
            last30Days: 68,
            trend: 'up',
            dailySales: [
              { date: '09/10', units: 2 }, { date: '10/10', units: 2 }, { date: '11/10', units: 2 },
              { date: '12/10', units: 2 }, { date: '13/10', units: 2 }, { date: '14/10', units: 3 },
              { date: '15/10', units: 2 }, { date: '16/10', units: 2 }, { date: '17/10', units: 2 },
              { date: '18/10', units: 2 }, { date: '19/10', units: 3 }, { date: '20/10', units: 2 },
              { date: '21/10', units: 2 }, { date: '22/10', units: 2 }, { date: '23/10', units: 3 },
              { date: '24/10', units: 2 }, { date: '25/10', units: 2 }, { date: '26/10', units: 3 },
              { date: '27/10', units: 2 }, { date: '28/10', units: 2 }, { date: '29/10', units: 3 },
              { date: '30/10', units: 2 }, { date: '31/10', units: 3 }, { date: '01/11', units: 3 },
              { date: '02/11', units: 3 }, { date: '03/11', units: 3 }, { date: '04/11', units: 3 },
              { date: '05/11', units: 3 }, { date: '06/11', units: 3 }, { date: '07/11', units: 3 },
            ],
          },
        },
        { 
          id: '5', 
          name: 'Budín Inglés 400g', 
          price: 3200, 
          currentStock: 6, 
          finalStock: 4, 
          orderQuantity: 10,
          sales: {
            last7Days: 10,
            weekAvg: 12,
            last15Days: 18,
            last30Days: 38,
            trend: 'down',
            dailySales: [
              { date: '09/10', units: 2 }, { date: '10/10', units: 1 }, { date: '11/10', units: 2 },
              { date: '12/10', units: 1 }, { date: '13/10', units: 1 }, { date: '14/10', units: 2 },
              { date: '15/10', units: 1 }, { date: '16/10', units: 2 }, { date: '17/10', units: 1 },
              { date: '18/10', units: 1 }, { date: '19/10', units: 2 }, { date: '20/10', units: 1 },
              { date: '21/10', units: 2 }, { date: '22/10', units: 1 }, { date: '23/10', units: 1 },
              { date: '24/10', units: 2 }, { date: '25/10', units: 1 }, { date: '26/10', units: 1 },
              { date: '27/10', units: 2 }, { date: '28/10', units: 1 }, { date: '29/10', units: 1 },
              { date: '30/10', units: 2 }, { date: '31/10', units: 1 }, { date: '01/11', units: 1 },
              { date: '02/11', units: 1 }, { date: '03/11', units: 1 }, { date: '04/11', units: 2 },
              { date: '05/11', units: 1 }, { date: '06/11', units: 1 }, { date: '07/11', units: 1 },
            ],
          },
        },
        { 
          id: '6', 
          name: 'Budín de Naranja 500g', 
          price: 2900, 
          currentStock: 14, 
          finalStock: 8, 
          orderQuantity: 8,
          sales: {
            last7Days: 11,
            weekAvg: 10,
            last15Days: 19,
            last30Days: 40,
            trend: 'stable',
            dailySales: [
              { date: '09/10', units: 1 }, { date: '10/10', units: 1 }, { date: '11/10', units: 1 },
              { date: '12/10', units: 2 }, { date: '13/10', units: 1 }, { date: '14/10', units: 1 },
              { date: '15/10', units: 2 }, { date: '16/10', units: 1 }, { date: '17/10', units: 1 },
              { date: '18/10', units: 1 }, { date: '19/10', units: 2 }, { date: '20/10', units: 1 },
              { date: '21/10', units: 1 }, { date: '22/10', units: 2 }, { date: '23/10', units: 1 },
              { date: '24/10', units: 1 }, { date: '25/10', units: 2 }, { date: '26/10', units: 1 },
              { date: '27/10', units: 1 }, { date: '28/10', units: 2 }, { date: '29/10', units: 1 },
              { date: '30/10', units: 1 }, { date: '31/10', units: 2 }, { date: '01/11', units: 1 },
              { date: '02/11', units: 2 }, { date: '03/11', units: 1 }, { date: '04/11', units: 2 },
              { date: '05/11', units: 1 }, { date: '06/11', units: 2 }, { date: '07/11', units: 2 },
            ],
          },
        },
      ],
    },
    {
      id: 'group-2',
      name: 'Panes',
      products: [
        { id: '7', name: 'Pan de Molde Integral 500g', price: 1850, currentStock: 20, finalStock: 12, orderQuantity: 12 },
        { id: '8', name: 'Pan de Molde Blanco 500g', price: 1650, currentStock: 25, finalStock: 15, orderQuantity: 15 },
        { id: '9', name: 'Pan Lactal 350g', price: 1450, currentStock: 18, finalStock: 10, orderQuantity: 10 },
        { id: '10', name: 'Pan Hamburguesa x6', price: 2200, currentStock: 12, finalStock: 8, orderQuantity: 12 },
      ],
    },
    {
      id: 'group-3',
      name: 'Galletas',
      products: [
        { id: '11', name: 'Galletas Dulces Clásicas 250g', price: 1890, currentStock: 30, finalStock: 20, orderQuantity: 20 },
        { id: '12', name: 'Galletas de Chocolate 300g', price: 2150, currentStock: 22, finalStock: 15, orderQuantity: 15 },
        { id: '13', name: 'Galletas Saladas 200g', price: 1450, currentStock: 28, finalStock: 18, orderQuantity: 18 },
        { id: '14', name: 'Galletas de Avena 250g', price: 2050, currentStock: 16, finalStock: 10, orderQuantity: 12 },
      ],
    },
  ]);

  const calculateTotal = () => {
    return productGroups.reduce((total, group) => {
      return total + group.products.reduce((groupTotal, product) => {
        return groupTotal + (product.price * product.orderQuantity);
      }, 0);
    }, 0);
  };

  const calculateTotalUnits = () => {
    return productGroups.reduce((total, group) => {
      return total + group.products.reduce((groupTotal, product) => {
        return groupTotal + product.orderQuantity;
      }, 0);
    }, 0);
  };

  const calculateTotalProducts = () => {
    return productGroups.reduce((total, group) => {
      return total + group.products.length;
    }, 0);
  };

  const handleNotesChange = (value: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      content: value,
      timestamp: new Date(),
      author: 'Usuario',
      isResolved: false,
    };
    setNotes([newNote, ...notes]); // Add to beginning for newest first
    toast.success('Nota añadida');
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
    toast.success('Nota eliminada');
  };

  const handleToggleResolved = (id: string) => {
    setNotes(notes.map(note => 
      note.id === id 
        ? { ...note, isResolved: !note.isResolved }
        : note
    ));
    const note = notes.find(n => n.id === id);
    if (note) {
      toast.success(note.isResolved ? 'Nota marcada como pendiente' : 'Nota marcada como resuelta');
    }
  };

  const handleEditNote = (id: string, content: string) => {
    setNotes(notes.map(note =>
      note.id === id
        ? { ...note, content, lastEdited: new Date() }
        : note
    ));
    toast.success('Nota actualizada con éxito');
  };

  const handleUpdateStock = () => {
    setOrderData({
      ...orderData,
      lastStockUpdate: new Date().toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    });
    toast.success('Stock actualizado correctamente');
  };

  const handleApplyStock = (products: any[], selectedDate: Date) => {
    // Here we would update the actual stock values
    // For now, just simulate the update
    setOrderData({
      ...orderData,
      lastStockUpdate: new Date().toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    });
  };

  // Prepare data for Update Stock Modal
  const getReceivedProducts = () => {
    const allProducts: any[] = [];
    
    // Generate more products for demo (simulating 50+ products)
    productGroups.forEach((group, groupIndex) => {
      group.products.forEach((product, productIndex) => {
        // Create multiple variations to simulate more products
        for (let i = 0; i < 3; i++) {
          allProducts.push({
            id: `${product.id}-${i}`,
            name: i === 0 ? product.name : `${product.name} (Variante ${i})`,
            quantityOrdered: product.orderQuantity,
            quantityReceived: i === 0 ? product.orderQuantity : // Some have correct quantity
                            i === 1 ? Math.max(0, product.orderQuantity - Math.floor(Math.random() * 5)) : // Some missing
                            product.orderQuantity + Math.floor(Math.random() * 3), // Some excess
            currentStock: product.currentStock,
            salesSinceDate: product.sales?.last7Days || Math.floor(Math.random() * 10),
            isNew: i === 2 && productIndex === 0, // Mark some as new
          });
        }
      });
    });
    
    return allProducts;
  };

  const handleProductUpdate = (groupId: string, productId: string, field: keyof Product, value: any) => {
    setProductGroups(productGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          products: group.products.map(product => {
            if (product.id === productId) {
              return { ...product, [field]: value };
            }
            return product;
          }),
        };
      }
      return group;
    }));
  };

  const handleRemoveProduct = (groupId: string, productId: string) => {
    setProductGroups(productGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          products: group.products.filter(product => product.id !== productId),
        };
      }
      return group;
    }));
    toast.success('Producto eliminado');
  };

  const handleViewStats = (product: Product) => {
    setSelectedProduct(product);
    setIsStatsModalOpen(true);
  };

  const handleSave = () => {
    toast.success('Pedido guardado correctamente');
  };

  const handleUndo = () => {
    toast.info('Cambios deshechos');
  };

  const handleExport = () => {
    toast.success('Pedido exportado correctamente');
  };

  const handleCopyOrder = () => {
    // Generate order text
    let orderText = `=== PEDIDO - ${orderData.supplier} ===\n`;
    orderText += `Fecha: ${orderData.date}\n`;
    orderText += `Estado: ${orderData.status}\n\n`;
    
    // Add products by group
    productGroups.forEach(group => {
      if (group.products.length > 0) {
        orderText += `\n--- ${group.name} ---\n`;
        group.products.forEach(product => {
          if (product.orderQuantity > 0) {
            const subtotal = product.price * product.orderQuantity;
            orderText += `${product.orderQuantity}x ${product.name} - $${product.price.toLocaleString('es-ES')} = $${subtotal.toLocaleString('es-ES')}\n`;
          }
        });
      }
    });
    
    // Add totals
    orderText += `\n======================\n`;
    orderText += `Total unidades: ${calculateTotalUnits()}\n`;
    orderText += `TOTAL A PAGAR: $${calculateTotal().toLocaleString('es-ES')}\n`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(orderText).then(() => {
      toast.success('Pedido copiado al portapapeles');
    }).catch(() => {
      toast.error('Error al copiar el pedido');
    });
  };

  // Calculate variation percent (simulated as 12.5% increase)
  const variationPercent = 12.5;

  // Calculate global stats for the statistics section
  const calculateGlobalStats = () => {
    let initialStock = 0;
    let finalStock = 0;
    let totalPrice = 0;
    let productCount = 0;

    productGroups.forEach(group => {
      group.products.forEach(product => {
        initialStock += product.currentStock;
        finalStock += product.finalStock;
        totalPrice += product.price;
        productCount++;
      });
    });

    const totalVariation = initialStock > 0 
      ? ((finalStock - initialStock) / initialStock) * 100 
      : 0;
    
    const avgUnitPrice = productCount > 0 ? totalPrice / productCount : 0;
    const avgTicket = productCount > 0 ? calculateTotal() / productCount : 0;
    
    // Simulate new products (could track this with a flag on products)
    const newProducts = 3;

    return {
      initialStock,
      finalStock,
      totalVariation,
      avgUnitPrice,
      avgTicket,
      newProducts,
    };
  };

  const globalStats = calculateGlobalStats();

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <div className="max-w-[1400px] mx-auto px-4 py-6 pb-32">
        {/* Compact Header */}
        <CompactHeader
          supplier={orderData.supplier}
          status={orderData.status}
          date={orderData.date}
          dataSource={orderData.dataSource}
          total={calculateTotal()}
          onBack={() => toast.info('Regresando a vista general')}
          onUpdateStock={() => setIsUpdateStockModalOpen(true)}
          onDuplicate={() => toast.success('Pedido duplicado')}
          onExport={handleExport}
        />

        <div className="mt-6 space-y-6">
          {/* Notes Log */}
          <NotesLog
            notes={notes}
            onAddNote={handleNotesChange}
            onDeleteNote={handleDeleteNote}
            onToggleResolved={handleToggleResolved}
            onEditNote={handleEditNote}
          />

          {/* Product Groups */}
          <div className="space-y-4">
            <h2 className="text-[#0E2E2B]">Grupos de productos</h2>
            {productGroups.map((group) => (
              <EnhancedProductGroup
                key={group.id}
                group={group}
                onProductUpdate={handleProductUpdate}
                onRemoveProduct={handleRemoveProduct}
                onViewStats={handleViewStats}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <StickyActionBar
        totalUnits={calculateTotalUnits()}
        total={calculateTotal()}
        onSave={handleSave}
        onUndo={handleUndo}
        onExport={handleExport}
        onCopyOrder={handleCopyOrder}
      />

      {/* Product Stats Modal */}
      <ProductStatsModal
        product={selectedProduct}
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />

      {/* Update Stock Modal */}
      <UpdateStockModal
        isOpen={isUpdateStockModalOpen}
        onClose={() => setIsUpdateStockModalOpen(false)}
        onUpdateStock={handleUpdateStock}
        onApplyStock={handleApplyStock}
        receivedProducts={getReceivedProducts()}
      />

      <Toaster position="top-right" />
    </div>
  );
}