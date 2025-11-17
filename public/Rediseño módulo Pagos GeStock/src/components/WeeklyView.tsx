import { useState } from 'react';
import { Search, Grid3x3, Table2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { PaymentMethodBadge } from './ui/PaymentMethodBadge';

interface WeeklyViewProps {
  onViewChange: (view: string) => void;
}

export function WeeklyView({ onViewChange }: WeeklyViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const weekTotal = 136430.50;

  const invoices = [
    {
      id: '1',
      provider: 'Distribuidora del Norte S.A.',
      document: 'Factura A-0001-00234567',
      amount: 45230.50,
      method: 'transferencia' as const,
      paymentDate: '2025-11-12',
      comment: 'Pedido urgente - Acordado descuento 5%'
    },
    {
      id: '2',
      provider: 'Mayorista Central',
      document: 'Factura B-0002-00156789',
      amount: 28450.00,
      method: 'credito' as const,
      paymentDate: '2025-11-15',
      comment: 'Pago contra entrega'
    },
    {
      id: '3',
      provider: 'Importadora Global Ltda.',
      document: 'Factura A-0003-00789012',
      amount: 62750.00,
      method: 'transferencia' as const,
      paymentDate: '2025-11-14',
      comment: ''
    }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', { 
      weekday: 'short',
      day: '2-digit', 
      month: 'short'
    });
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
        <div className="flex items-center justify-between mb-2">
          <h1 style={{ color: '#2A2E2F' }}>Vista Semanal</h1>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-black/5 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" style={{ color: '#666' }} />
            </button>
            <span style={{ color: '#2A2E2F' }}>Semana 10–16 nov</span>
            <button className="p-2 hover:bg-black/5 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5" style={{ color: '#666' }} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm" style={{ color: '#666' }}>
            Total semanal:
          </p>
          <span className="text-2xl" style={{ color: '#4A90E2' }}>
            {formatAmount(weekTotal)}
          </span>
        </div>
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
            onClick={() => onViewChange('table')}
            className="p-2 rounded transition-all"
            style={{ color: '#666' }}
          >
            <Table2 className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded transition-all"
            style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tarjetas compactas */}
      <div className="space-y-3">
        {invoices.map(invoice => (
          <div
            key={invoice.id}
            className="bg-white rounded-lg p-4 border transition-all duration-200 hover:shadow-md cursor-pointer"
            style={{ borderColor: '#E5E6E7', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)' }}
          >
            <div className="flex items-center gap-4">
              {/* Fecha */}
              <div className="flex-shrink-0 text-center" style={{ width: '80px' }}>
                <div className="text-sm" style={{ color: '#2A2E2F' }}>
                  {formatDate(invoice.paymentDate)}
                </div>
              </div>

              {/* Información principal */}
              <div className="flex-1">
                <h3 className="mb-1" style={{ color: '#2A2E2F' }}>
                  {invoice.provider}
                </h3>
                <p className="text-sm" style={{ color: '#666' }}>
                  {invoice.document}
                </p>
              </div>

              {/* Método */}
              <div className="flex-shrink-0">
                <PaymentMethodBadge method={invoice.method} size="sm" />
              </div>

              {/* Monto */}
              <div className="flex-shrink-0 text-right" style={{ width: '140px' }}>
                <div className="text-xl" style={{ color: '#2A2E2F' }}>
                  {formatAmount(invoice.amount)}
                </div>
              </div>
            </div>

            {/* Comentario si existe */}
            {invoice.comment && (
              <div className="mt-3 ml-24">
                <div 
                  className="text-xs px-3 py-1.5 rounded-lg inline-block"
                  style={{ backgroundColor: 'rgba(74, 144, 226, 0.08)', color: '#2A2E2F' }}
                >
                  {invoice.comment}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
