import { useState } from 'react';
import { Search, Plus, Image, Grid3x3, Table2, Calendar } from 'lucide-react';
import { InvoiceCard } from './InvoiceCard';
import { RegisterInvoiceModal } from './RegisterInvoiceModal';

interface MainViewProps {
  onViewChange: (view: string) => void;
}

export function MainView({ onViewChange }: MainViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'weekly'>('grid');
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Datos mock de facturas por pagar
  const unpaidInvoices = [
    {
      id: '1',
      provider: 'Distribuidora del Norte S.A.',
      type: 'Factura',
      number: 'A-0001-00234567',
      amount: 45230.50,
      paymentMethod: 'transferencia',
      paymentDate: '2025-11-12',
      dueDate: '2025-11-20',
      comment: 'Pedido urgente - Acordado descuento 5%',
      isPaid: false
    },
    {
      id: '2',
      provider: 'Mayorista Central',
      type: 'Factura',
      number: 'B-0002-00156789',
      amount: 28450.00,
      paymentMethod: 'credito',
      paymentDate: '2025-11-15',
      dueDate: '2025-11-18',
      comment: 'Pago contra entrega',
      isPaid: false
    },
    {
      id: '3',
      provider: 'Importadora Global Ltda.',
      type: 'Factura',
      number: 'A-0003-00789012',
      amount: 62800.25,
      paymentMethod: 'transferencia',
      paymentDate: '2025-11-14',
      dueDate: '2025-11-25',
      comment: '',
      isPaid: false
    }
  ];

  // Datos mock de facturas pagadas
  const paidInvoices = [
    {
      id: '4',
      provider: 'Proveedor Express S.R.L.',
      type: 'Factura',
      number: 'A-0001-00234560',
      amount: 18750.00,
      paymentMethod: 'efectivo',
      paymentDate: '2025-11-10',
      dueDate: '2025-11-15',
      comment: 'Pagado con descuento por pronto pago',
      isPaid: true
    },
    {
      id: '5',
      provider: 'Comercial San Martín',
      type: 'Remito',
      number: 'R-0045-00012345',
      amount: 34200.75,
      paymentMethod: 'transferencia',
      paymentDate: '2025-11-08',
      dueDate: '2025-11-12',
      comment: '',
      isPaid: true
    },
    {
      id: '6',
      provider: 'Logística del Sur',
      type: 'Factura',
      number: 'B-0008-00098765',
      amount: 12450.00,
      paymentMethod: 'credito',
      paymentDate: '2025-11-05',
      dueDate: '2025-11-10',
      comment: 'Primera cuota de 3',
      isPaid: true
    }
  ];

  const handleViewModeChange = (mode: 'grid' | 'table' | 'weekly') => {
    setViewMode(mode);
    if (mode === 'table') {
      onViewChange('table');
    } else if (mode === 'weekly') {
      onViewChange('weekly');
    }
  };

  return (
    <div className="px-8 py-6">
      {/* Encabezado de página */}
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: '#2A2E2F' }}>Pagos</h1>
        <p className="text-sm" style={{ color: '#666' }}>
          Gestioná las facturas y pagos de tus proveedores
        </p>
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center justify-between mb-6">
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar por proveedor, número..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border outline-none transition-all"
            style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
          />
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3">
          {/* Selector de vistas */}
          <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}>
            <button
              onClick={() => handleViewModeChange('grid')}
              className="p-2 rounded transition-all"
              style={{ 
                backgroundColor: viewMode === 'grid' ? '#4A90E2' : 'transparent',
                color: viewMode === 'grid' ? '#FFFFFF' : '#666'
              }}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('table')}
              className="p-2 rounded transition-all"
              style={{ 
                backgroundColor: viewMode === 'table' ? '#4A90E2' : 'transparent',
                color: viewMode === 'table' ? '#FFFFFF' : '#666'
              }}
            >
              <Table2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('weekly')}
              className="p-2 rounded transition-all"
              style={{ 
                backgroundColor: viewMode === 'weekly' ? '#4A90E2' : 'transparent',
                color: viewMode === 'weekly' ? '#FFFFFF' : '#666'
              }}
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => onViewChange('gallery')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all hover:shadow-md"
            style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF', color: '#2A2E2F' }}
          >
            <Image className="w-4 h-4" />
            <span className="text-sm">Ver fotos</span>
          </button>

          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:shadow-md"
            style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Registrar factura</span>
          </button>
        </div>
      </div>

      {/* Sección: Facturas por pagar */}
      <section className="mb-8">
        <h2 className="mb-4" style={{ color: '#2A2E2F' }}>Facturas por pagar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unpaidInvoices.map(invoice => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      </section>

      {/* Sección: Facturas pagadas */}
      <section>
        <h2 className="mb-4" style={{ color: '#2A2E2F' }}>Facturas pagadas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paidInvoices.map(invoice => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      </section>

      {/* Modal de registro */}
      {showRegisterModal && (
        <RegisterInvoiceModal onClose={() => setShowRegisterModal(false)} />
      )}
    </div>
  );
}
