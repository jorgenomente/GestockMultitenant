import { X, ExternalLink, Calendar, CreditCard } from 'lucide-react';
import { DocumentIcon } from './ui/DocumentIcon';
import { PaymentMethodBadge } from './ui/PaymentMethodBadge';

interface PhotoPreviewModalProps {
  document: any;
  onClose: () => void;
}

export function PhotoPreviewModal({ document, onClose }: PhotoPreviewModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#E3E5E7' }}>
          <h2 style={{ color: '#2A2E2F' }}>Vista previa del comprobante</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" style={{ color: '#666' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Thumbnail del documento */}
          <div 
            className="w-full aspect-[3/4] rounded-xl mb-6 flex items-center justify-center"
            style={{ backgroundColor: '#F5F6F7' }}
          >
            <div className="text-center">
              <DocumentIcon type={document.type} size="lg" />
              <p className="mt-4 text-sm" style={{ color: '#999' }}>
                Imagen almacenada en Google Drive
              </p>
            </div>
          </div>

          {/* Información del documento */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm mb-1" style={{ color: '#666' }}>
                Proveedor
              </label>
              <p style={{ color: '#2A2E2F' }}>{document.provider}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: '#666' }}>
                  Documento
                </label>
                <p className="text-sm" style={{ color: '#2A2E2F' }}>{document.number}</p>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: '#666' }}>
                  Importe
                </label>
                <p style={{ color: '#2A2E2F' }}>{formatAmount(document.amount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: '#666' }}>
                  Método de pago
                </label>
                <div className="mt-1">
                  <PaymentMethodBadge method="transferencia" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: '#666' }}>
                  Fecha de pago
                </label>
                <p className="text-sm" style={{ color: '#2A2E2F' }}>{formatDate(document.date)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: '#666' }}>
                Vencimiento
              </label>
              <p className="text-sm" style={{ color: '#2A2E2F' }}>{formatDate(document.date)}</p>
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: '#666' }}>
                Comentario
              </label>
              <p className="text-sm" style={{ color: '#666' }}>
                Sin comentarios adicionales
              </p>
            </div>
          </div>

          {/* Botón de acción */}
          <div className="space-y-3">
            <button
              onClick={() => window.open(document.driveUrl, '_blank')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all hover:shadow-md"
              style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
            >
              <ExternalLink className="w-5 h-5" />
              <span>Abrir en Google Drive</span>
            </button>

            <p className="text-center text-xs" style={{ color: '#999' }}>
              El archivo se almacena externamente en Google Drive.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
