import { useState } from 'react';
import { X, ExternalLink, Image, CheckCircle } from 'lucide-react';

interface RegisterInvoiceModalProps {
  onClose: () => void;
}

export function RegisterInvoiceModal({ onClose }: RegisterInvoiceModalProps) {
  const [formData, setFormData] = useState({
    docType: 'factura',
    number: '',
    provider: '',
    amount: '',
    method: 'transferencia',
    paymentDate: '',
    dueDate: '',
    observation: '',
    photoUrl: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Formulario enviado:', formData);
    onClose();
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
          <h2 style={{ color: '#2A2E2F' }}>Registrar factura</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" style={{ color: '#666' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            {/* Tipo de documento */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#2A2E2F' }}>
                Tipo de documento
              </label>
              <select
                value={formData.docType}
                onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border outline-none transition-all"
                style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF', color: '#2A2E2F' }}
              >
                <option value="factura">Factura</option>
                <option value="remito">Remito</option>
                <option value="nota-credito">Nota de crédito</option>
                <option value="compra-local">Compra local</option>
              </select>
            </div>

            {/* Número */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#2A2E2F' }}>
                Número
              </label>
              <input
                type="text"
                placeholder="Ej: A-0001-00234567"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border outline-none transition-all"
                style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
              />
            </div>

            {/* Proveedor */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#2A2E2F' }}>
                Proveedor
              </label>
              <input
                type="text"
                placeholder="Nombre del proveedor"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border outline-none transition-all"
                style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
              />
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#2A2E2F' }}>
                Monto
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border outline-none transition-all"
                style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
              />
            </div>

            {/* Método de pago */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#2A2E2F' }}>
                Método de pago
              </label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border outline-none transition-all"
                style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF', color: '#2A2E2F' }}
              >
                <option value="transferencia">Transferencia</option>
                <option value="credito">Crédito</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: '#2A2E2F' }}>
                  Fecha de pago
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-all"
                  style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#2A2E2F' }}>
                  Vencimiento
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-all"
                  style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
                />
              </div>
            </div>

            {/* Observación */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#2A2E2F' }}>
                Observación
              </label>
              <textarea
                placeholder="Comentarios adicionales..."
                value={formData.observation}
                onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border outline-none transition-all resize-none"
                style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
              />
            </div>

            {/* Sección foto (low-cost) */}
            <div 
              className="p-5 rounded-xl border-2 border-dashed"
              style={{ borderColor: '#E3E5E7', backgroundColor: '#FBFBFB' }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#4A90E2' }}
                >
                  <Image className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="mb-1" style={{ color: '#2A2E2F' }}>
                    Foto de la factura
                  </h3>
                  <p className="text-sm" style={{ color: '#666' }}>
                    Cargar foto mediante formulario externo (sin costo).
                    <br />
                    Las fotos se guardarán automáticamente en Google Drive.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.open('https://forms.google.com/example', '_blank')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all hover:shadow-md mb-4"
                style={{ borderColor: '#4A90E2', color: '#4A90E2', backgroundColor: '#FFFFFF' }}
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm">Abrir formulario externo</span>
              </button>

              <div>
                <label className="block text-sm mb-2" style={{ color: '#2A2E2F' }}>
                  Enlace de la foto (Drive)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-all"
                  style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
                />
              </div>

              {/* Vista previa placeholder */}
              {formData.photoUrl && (
                <div className="mt-4">
                  <div 
                    className="w-full h-32 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#E5E6E7' }}
                  >
                    <div className="text-center">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#16A34A' }} />
                      <p className="text-sm" style={{ color: '#666' }}>
                        Enlace de foto agregado
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t" style={{ borderColor: '#E3E5E7' }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg border transition-all hover:shadow-md"
              style={{ borderColor: '#E3E5E7', color: '#2A2E2F', backgroundColor: '#FFFFFF' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-lg transition-all hover:shadow-md"
              style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
            >
              Guardar factura
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
