import { Plus, Search, Settings, ChevronDown, Calendar, MoreVertical, ExternalLink, AlertCircle } from 'lucide-react';
import { PaymentMethodBadge } from './ui/PaymentMethodBadge';
import { DocumentIcon } from './ui/DocumentIcon';

export function UIKit() {
  return (
    <div className="px-8 py-6">
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: '#2A2E2F' }}>UI Kit - Sistema de Diseño GeStock</h1>
        <p className="text-sm" style={{ color: '#666' }}>
          Componentes y estilos del módulo Pagos
        </p>
      </div>

      <div className="space-y-12">
        {/* Paleta de colores */}
        <section>
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Paleta de colores</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="h-24 rounded-lg mb-2" style={{ backgroundColor: '#4A90E2' }} />
              <p className="text-sm" style={{ color: '#2A2E2F' }}>Azul primario</p>
              <p className="text-xs" style={{ color: '#999' }}>#4A90E2</p>
            </div>
            <div>
              <div className="h-24 rounded-lg mb-2" style={{ backgroundColor: '#2A2E2F' }} />
              <p className="text-sm" style={{ color: '#2A2E2F' }}>Gris oscuro</p>
              <p className="text-xs" style={{ color: '#999' }}>#2A2E2F</p>
            </div>
            <div>
              <div className="h-24 rounded-lg border mb-2" style={{ backgroundColor: '#F5F6F7', borderColor: '#E3E5E7' }} />
              <p className="text-sm" style={{ color: '#2A2E2F' }}>Fondo</p>
              <p className="text-xs" style={{ color: '#999' }}>#F5F6F7</p>
            </div>
            <div>
              <div className="h-24 rounded-lg border mb-2" style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E5E7' }} />
              <p className="text-sm" style={{ color: '#2A2E2F' }}>Blanco</p>
              <p className="text-xs" style={{ color: '#999' }}>#FFFFFF</p>
            </div>
            <div>
              <div className="h-24 rounded-lg mb-2" style={{ backgroundColor: '#FFF3E9' }} />
              <p className="text-sm" style={{ color: '#2A2E2F' }}>Fondo Crédito</p>
              <p className="text-xs" style={{ color: '#999' }}>#FFF3E9</p>
            </div>
            <div>
              <div className="h-24 rounded-lg mb-2" style={{ backgroundColor: '#EAF2FF' }} />
              <p className="text-sm" style={{ color: '#2A2E2F' }}>Fondo Transferencia</p>
              <p className="text-xs" style={{ color: '#999' }}>#EAF2FF</p>
            </div>
            <div>
              <div className="h-24 rounded-lg mb-2" style={{ backgroundColor: '#EAF8EB' }} />
              <p className="text-sm" style={{ color: '#2A2E2F' }}>Fondo Efectivo</p>
              <p className="text-xs" style={{ color: '#999' }}>#EAF8EB</p>
            </div>
            <div>
              <div className="h-24 rounded-lg border mb-2" style={{ backgroundColor: '#E3E5E7', borderColor: '#E3E5E7' }} />
              <p className="text-sm" style={{ color: '#2A2E2F' }}>Bordes</p>
              <p className="text-xs" style={{ color: '#999' }}>#E3E5E7</p>
            </div>
          </div>
        </section>

        {/* Botones */}
        <section>
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Botones</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-3" style={{ color: '#666' }}>Primary</p>
              <div className="flex items-center gap-3">
                <button
                  className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all hover:shadow-md"
                  style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar factura</span>
                </button>
                <button
                  className="px-6 py-3 rounded-lg transition-all hover:shadow-md"
                  style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
                >
                  Guardar
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm transition-all hover:shadow-md"
                  style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
                >
                  Editar pago
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm mb-3" style={{ color: '#666' }}>Outline</p>
              <div className="flex items-center gap-3">
                <button
                  className="flex items-center gap-2 px-6 py-3 rounded-lg border transition-all hover:shadow-md"
                  style={{ borderColor: '#4A90E2', color: '#4A90E2', backgroundColor: '#FFFFFF' }}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir formulario</span>
                </button>
                <button
                  className="px-6 py-3 rounded-lg border transition-all hover:shadow-md"
                  style={{ borderColor: '#E3E5E7', color: '#2A2E2F', backgroundColor: '#FFFFFF' }}
                >
                  Cancelar
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm mb-3" style={{ color: '#666' }}>Ghost</p>
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                  <Settings className="w-5 h-5" style={{ color: '#666' }} />
                </button>
                <button className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5" style={{ color: '#666' }} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Inputs */}
        <section>
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Inputs</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#2A2E2F' }}>
                Texto simple
              </label>
              <input
                type="text"
                placeholder="Escribe algo..."
                className="w-full px-4 py-2 rounded-lg border outline-none transition-all"
                style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#2A2E2F' }}>
                Con ícono de búsqueda
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#999' }} />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border outline-none transition-all"
                  style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#2A2E2F' }}>
                Textarea
              </label>
              <textarea
                placeholder="Comentarios..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg border outline-none transition-all resize-none"
                style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
              />
            </div>
          </div>
        </section>

        {/* Dropdowns */}
        <section>
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Dropdowns</h2>
          <div className="space-y-4 max-w-md">
            <select
              className="w-full px-4 py-2 rounded-lg border outline-none"
              style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF', color: '#2A2E2F' }}
            >
              <option>Seleccionar tipo</option>
              <option>Factura</option>
              <option>Remito</option>
              <option>Nota de crédito</option>
            </select>

            <button 
              className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all"
              style={{ borderColor: '#E3E5E7', color: '#2A2E2F' }}
            >
              <span className="text-sm">Sucursal Centro</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Badges y chips */}
        <section>
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Badges y chips</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-3" style={{ color: '#666' }}>Métodos de pago</p>
              <div className="flex items-center gap-3">
                <PaymentMethodBadge method="credito" />
                <PaymentMethodBadge method="transferencia" />
                <PaymentMethodBadge method="efectivo" />
              </div>
            </div>

            <div>
              <p className="text-sm mb-3" style={{ color: '#666' }}>Tamaño pequeño</p>
              <div className="flex items-center gap-3">
                <PaymentMethodBadge method="credito" size="sm" />
                <PaymentMethodBadge method="transferencia" size="sm" />
                <PaymentMethodBadge method="efectivo" size="sm" />
              </div>
            </div>

            <div>
              <p className="text-sm mb-3" style={{ color: '#666' }}>Chip de comentario</p>
              <div 
                className="text-sm px-3 py-2 rounded-lg inline-block"
                style={{ backgroundColor: 'rgba(74, 144, 226, 0.08)', color: '#2A2E2F' }}
              >
                Pedido urgente - Acordado descuento 5%
              </div>
            </div>
          </div>
        </section>

        {/* Iconos de documentos */}
        <section>
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Iconos de documentos GeStock</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-3" style={{ color: '#666' }}>Tamaño grande</p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <DocumentIcon type="factura" size="lg" />
                  <p className="text-xs mt-2" style={{ color: '#666' }}>Factura</p>
                </div>
                <div className="text-center">
                  <DocumentIcon type="remito" size="lg" />
                  <p className="text-xs mt-2" style={{ color: '#666' }}>Remito</p>
                </div>
                <div className="text-center">
                  <DocumentIcon type="nota-credito" size="lg" />
                  <p className="text-xs mt-2" style={{ color: '#666' }}>Nota de crédito</p>
                </div>
                <div className="text-center">
                  <DocumentIcon type="compra-local" size="lg" />
                  <p className="text-xs mt-2" style={{ color: '#666' }}>Compra local</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm mb-3" style={{ color: '#666' }}>Tamaño mediano</p>
              <div className="flex items-center gap-3">
                <DocumentIcon type="factura" size="md" />
                <DocumentIcon type="remito" size="md" />
                <DocumentIcon type="nota-credito" size="md" />
                <DocumentIcon type="compra-local" size="md" />
              </div>
            </div>

            <div>
              <p className="text-sm mb-3" style={{ color: '#666' }}>Tamaño pequeño</p>
              <div className="flex items-center gap-3">
                <DocumentIcon type="factura" size="sm" />
                <DocumentIcon type="remito" size="sm" />
                <DocumentIcon type="nota-credito" size="sm" />
                <DocumentIcon type="compra-local" size="sm" />
              </div>
            </div>
          </div>
        </section>

        {/* Tarjetas */}
        <section>
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Tarjetas (Cards)</h2>
          <div className="space-y-4 max-w-md">
            <div
              className="rounded-xl p-5 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E5E6E7',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
              }}
            >
              <h3 className="mb-2" style={{ color: '#2A2E2F' }}>Tarjeta estándar</h3>
              <p className="text-sm" style={{ color: '#666' }}>
                Con sombra suave, bordes redondeados y efecto hover
              </p>
            </div>

            <div
              className="rounded-xl p-5 border"
              style={{
                backgroundColor: '#EAF2FF',
                borderColor: '#E5E6E7',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
              }}
            >
              <h3 className="mb-2" style={{ color: '#2A2E2F' }}>Tarjeta con fondo de color</h3>
              <p className="text-sm" style={{ color: '#666' }}>
                Para facturas pagadas según método de pago
              </p>
            </div>
          </div>
        </section>

        {/* Sistema de sombras */}
        <section>
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Sistema de sombras</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="h-24 rounded-xl bg-white flex items-center justify-center"
              style={{ boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)' }}
            >
              <p className="text-sm" style={{ color: '#666' }}>Sombra suave</p>
            </div>
            <div
              className="h-24 rounded-xl bg-white flex items-center justify-center"
              style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
            >
              <p className="text-sm" style={{ color: '#666' }}>Sombra media</p>
            </div>
            <div
              className="h-24 rounded-xl bg-white flex items-center justify-center"
              style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}
            >
              <p className="text-sm" style={{ color: '#666' }}>Sombra elevada</p>
            </div>
          </div>
        </section>

        {/* Espaciado */}
        <section>
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Sistema de espaciado</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm" style={{ color: '#666' }}>12px</div>
              <div className="h-8 rounded" style={{ width: '12px', backgroundColor: '#4A90E2' }} />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm" style={{ color: '#666' }}>16px</div>
              <div className="h-8 rounded" style={{ width: '16px', backgroundColor: '#4A90E2' }} />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm" style={{ color: '#666' }}>24px</div>
              <div className="h-8 rounded" style={{ width: '24px', backgroundColor: '#4A90E2' }} />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm" style={{ color: '#666' }}>32px</div>
              <div className="h-8 rounded" style={{ width: '32px', backgroundColor: '#4A90E2' }} />
            </div>
          </div>
        </section>

        {/* Bordes redondeados */}
        <section>
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Bordes redondeados</h2>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-white border" style={{ borderRadius: '8px', borderColor: '#E3E5E7' }}>
              <div className="text-center pt-8 text-sm" style={{ color: '#666' }}>8px</div>
            </div>
            <div className="w-24 h-24 bg-white border" style={{ borderRadius: '12px', borderColor: '#E3E5E7' }}>
              <div className="text-center pt-8 text-sm" style={{ color: '#666' }}>12px</div>
            </div>
            <div className="w-24 h-24 bg-white border" style={{ borderRadius: '16px', borderColor: '#E3E5E7' }}>
              <div className="text-center pt-8 text-sm" style={{ color: '#666' }}>16px</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
