import { Calendar, AlertCircle, MoreVertical } from 'lucide-react';
import { PaymentMethodBadge } from './ui/PaymentMethodBadge';

interface Invoice {
  id: string;
  provider: string;
  type: string;
  number: string;
  amount: number;
  paymentMethod: 'credito' | 'transferencia' | 'efectivo';
  paymentDate: string;
  dueDate: string;
  comment?: string;
  isPaid: boolean;
}

interface InvoiceCardProps {
  invoice: Invoice;
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  // Determinar color de fondo según método de pago (para facturas pagadas)
  const getBackgroundColor = () => {
    if (!invoice.isPaid) return '#FFFFFF';
    
    switch (invoice.paymentMethod) {
      case 'credito':
        return '#FFF3E9';
      case 'transferencia':
        return '#EAF2FF';
      case 'efectivo':
        return '#EAF8EB';
      default:
        return '#FFFFFF';
    }
  };

  return (
    <div
      className="rounded-xl p-5 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
      style={{
        backgroundColor: getBackgroundColor(),
        borderColor: '#E5E6E7',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="mb-1" style={{ color: '#2A2E2F' }}>
            {invoice.provider}
          </h3>
          <p className="text-sm" style={{ color: '#666' }}>
            {invoice.type} {invoice.number}
          </p>
        </div>
        <button className="p-1 hover:bg-black/5 rounded transition-colors">
          <MoreVertical className="w-4 h-4" style={{ color: '#999' }} />
        </button>
      </div>

      {/* Monto */}
      <div className="mb-4">
        <div className="text-3xl" style={{ color: '#2A2E2F' }}>
          {formatAmount(invoice.amount)}
        </div>
      </div>

      {/* Método de pago */}
      <div className="mb-4">
        <PaymentMethodBadge method={invoice.paymentMethod} />
      </div>

      {/* Fechas */}
      <div className="space-y-2 mb-4 pb-4 border-b" style={{ borderColor: '#E3E5E7' }}>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: '#999' }} />
          <span className="text-sm" style={{ color: '#666' }}>
            Fecha de pago:
          </span>
          <span className="text-sm" style={{ color: '#2A2E2F' }}>
            {formatDate(invoice.paymentDate)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" style={{ color: '#999' }} />
          <span className="text-sm" style={{ color: '#666' }}>
            Vencimiento:
          </span>
          <span className="text-sm" style={{ color: '#2A2E2F' }}>
            {formatDate(invoice.dueDate)}
          </span>
        </div>
      </div>

      {/* Comentario */}
      {invoice.comment && (
        <div className="mb-4">
          <div 
            className="text-xs px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'rgba(74, 144, 226, 0.08)', color: '#2A2E2F' }}
          >
            {invoice.comment}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button
          className="px-4 py-2 rounded-lg text-sm transition-all hover:shadow-md"
          style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
        >
          Editar pago
        </button>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-black/5 rounded transition-colors">
            <MoreVertical className="w-4 h-4" style={{ color: '#999' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
