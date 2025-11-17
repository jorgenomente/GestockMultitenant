import { useState } from 'react';
import { Search, Grid3x3, Table2, Calendar, MoreVertical, ChevronLeft } from 'lucide-react';
import { PaymentMethodBadge } from './ui/PaymentMethodBadge';

interface TableViewProps {
  onViewChange: (view: string) => void;
}

export function TableView({ onViewChange }: TableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const invoices = [
    {
      id: '1',
      provider: 'Distribuidora del Norte S.A.',
      document: 'Factura A-0001-00234567',
      amount: 45230.50,
      method: 'transferencia' as const,
      paymentDate: '2025-11-12',
      dueDate: '2025-11-20',
      isPaid: false
    },
    {
      id: '2',
      provider: 'Mayorista Central',
      document: 'Factura B-0002-00156789',
      amount: 28450.00,
      method: 'credito' as const,
      paymentDate: '2025-11-15',
      dueDate: '2025-11-18',
      isPaid: false
    },
    {
      id: '3',
      provider: 'Importadora Global Ltda.',
      document: 'Factura A-0003-00789012',
      amount: 62800.25,
      method: 'transferencia' as const,
      paymentDate: '2025-11-14',
      dueDate: '2025-11-25',
      isPaid: false
    },
    {
      id: '4',
      provider: 'Proveedor Express S.R.L.',
      document: 'Factura A-0001-00234560',
      amount: 18750.00,
      method: 'efectivo' as const,
      paymentDate: '2025-11-10',
      dueDate: '2025-11-15',
      isPaid: true
    },
    {
      id: '5',
      provider: 'Comercial San Martín',
      document: 'Remito R-0045-00012345',
      amount: 34200.75,
      method: 'transferencia' as const,
      paymentDate: '2025-11-08',
      dueDate: '2025-11-12',
      isPaid: true
    }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  return (
    <div className="px-8 py-6">
      {/* Navegación */}
      <button
        onClick={() => onViewChange('main')}
        className="flex items-center gap-2 mb-6 text-sm transition-colors hover:underline"
        style={{ color: '#4A90E2' }}
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a vista Grid
      </button>

      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: '#2A2E2F' }}>Vista Tabla</h1>
        <p className="text-sm" style={{ color: '#666' }}>
          Todas las facturas en formato tabla
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

        {/* Selector de vistas */}
        <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}>
          <button
            onClick={() => onViewChange('main')}
            className="p-2 rounded transition-all"
            style={{ color: '#666' }}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded transition-all"
            style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
          >
            <Table2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewChange('weekly')}
            className="p-2 rounded transition-all"
            style={{ color: '#666' }}
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E3E5E7', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #E3E5E7', backgroundColor: '#FBFBFB' }}>
              <th className="text-left px-6 py-4 text-sm" style={{ color: '#666' }}>Proveedor</th>
              <th className="text-left px-6 py-4 text-sm" style={{ color: '#666' }}>Documento</th>
              <th className="text-left px-6 py-4 text-sm" style={{ color: '#666' }}>Importe</th>
              <th className="text-left px-6 py-4 text-sm" style={{ color: '#666' }}>Método</th>
              <th className="text-left px-6 py-4 text-sm" style={{ color: '#666' }}>Pagada</th>
              <th className="text-left px-6 py-4 text-sm" style={{ color: '#666' }}>Vencimiento</th>
              <th className="text-left px-6 py-4 text-sm" style={{ color: '#666' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => (
              <tr
                key={invoice.id}
                className="transition-colors hover:bg-gray-50 cursor-pointer"
                style={{
                  borderBottom: index < invoices.length - 1 ? '1px solid #E3E5E7' : 'none',
                  backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FBFBFB'
                }}
              >
                <td className="px-6 py-4" style={{ color: '#2A2E2F' }}>
                  {invoice.provider}
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: '#666' }}>
                  {invoice.document}
                </td>
                <td className="px-6 py-4" style={{ color: '#2A2E2F' }}>
                  {formatAmount(invoice.amount)}
                </td>
                <td className="px-6 py-4">
                  <PaymentMethodBadge method={invoice.method} size="sm" />
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: '#666' }}>
                  {formatDate(invoice.paymentDate)}
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: '#666' }}>
                  {formatDate(invoice.dueDate)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 rounded-lg text-sm transition-all hover:shadow-md"
                      style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
                    >
                      Editar
                    </button>
                    <button className="p-1.5 hover:bg-black/5 rounded transition-colors">
                      <MoreVertical className="w-4 h-4" style={{ color: '#999' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
