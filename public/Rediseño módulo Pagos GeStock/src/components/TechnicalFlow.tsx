import { ArrowRight, Upload, Database, Link2, Image as ImageIcon, CheckCircle } from 'lucide-react';

export function TechnicalFlow() {
  return (
    <div className="px-8 py-6">
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: '#2A2E2F' }}>Flujo Técnico - Arquitectura Low-Cost</h1>
        <p className="text-sm" style={{ color: '#666' }}>
          Sistema de almacenamiento de fotos basado en Google Forms + Google Drive
        </p>
      </div>

      <div className="max-w-4xl">
        {/* Diagrama de flujo */}
        <section className="mb-12">
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Diagrama de flujo</h2>
          
          <div className="bg-white rounded-xl p-8 border" style={{ borderColor: '#E3E5E7', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}>
            <div className="flex items-center justify-between">
              {/* Paso 1 */}
              <div className="flex-1">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: '#EAF2FF' }}
                >
                  <Upload className="w-8 h-8" style={{ color: '#4A90E2' }} />
                </div>
                <h3 className="text-center mb-2" style={{ color: '#2A2E2F' }}>1. Usuario sube</h3>
                <p className="text-sm text-center" style={{ color: '#666' }}>
                  Foto a través de<br />Google Forms
                </p>
              </div>

              <ArrowRight className="w-8 h-8 flex-shrink-0 mx-4" style={{ color: '#999' }} />

              {/* Paso 2 */}
              <div className="flex-1">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: '#EAF8EB' }}
                >
                  <Database className="w-8 h-8" style={{ color: '#16A34A' }} />
                </div>
                <h3 className="text-center mb-2" style={{ color: '#2A2E2F' }}>2. Almacenamiento</h3>
                <p className="text-sm text-center" style={{ color: '#666' }}>
                  Google Drive<br />guarda la imagen
                </p>
              </div>

              <ArrowRight className="w-8 h-8 flex-shrink-0 mx-4" style={{ color: '#999' }} />

              {/* Paso 3 */}
              <div className="flex-1">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: '#FFF3E9' }}
                >
                  <Link2 className="w-8 h-8" style={{ color: '#D97706' }} />
                </div>
                <h3 className="text-center mb-2" style={{ color: '#2A2E2F' }}>3. Registro</h3>
                <p className="text-sm text-center" style={{ color: '#666' }}>
                  Usuario pega<br />enlace en GeStock
                </p>
              </div>

              <ArrowRight className="w-8 h-8 flex-shrink-0 mx-4" style={{ color: '#999' }} />

              {/* Paso 4 */}
              <div className="flex-1">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: '#F3F4F6' }}
                >
                  <ImageIcon className="w-8 h-8" style={{ color: '#666' }} />
                </div>
                <h3 className="text-center mb-2" style={{ color: '#2A2E2F' }}>4. Visualización</h3>
                <p className="text-sm text-center" style={{ color: '#666' }}>
                  Galería de<br />comprobantes
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Ventajas */}
        <section className="mb-12">
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Ventajas del modelo low-cost</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className="p-5 rounded-xl border"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E5E7', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#16A34A' }} />
                <div>
                  <h3 className="mb-1" style={{ color: '#2A2E2F' }}>Sin costo de almacenamiento</h3>
                  <p className="text-sm" style={{ color: '#666' }}>
                    Google Drive ofrece 15 GB gratuitos por cuenta
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="p-5 rounded-xl border"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E5E7', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#16A34A' }} />
                <div>
                  <h3 className="mb-1" style={{ color: '#2A2E2F' }}>Sin infraestructura compleja</h3>
                  <p className="text-sm" style={{ color: '#666' }}>
                    No requiere servidores de archivos ni CDN
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="p-5 rounded-xl border"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E5E7', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#16A34A' }} />
                <div>
                  <h3 className="mb-1" style={{ color: '#2A2E2F' }}>Escalable</h3>
                  <p className="text-sm" style={{ color: '#666' }}>
                    Fácil de migrar a cuentas corporativas si crece
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="p-5 rounded-xl border"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E5E7', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#16A34A' }} />
                <div>
                  <h3 className="mb-1" style={{ color: '#2A2E2F' }}>Backup automático</h3>
                  <p className="text-sm" style={{ color: '#666' }}>
                    Google se encarga del respaldo de datos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Implementación técnica */}
        <section className="mb-12">
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Implementación técnica</h2>
          
          <div className="space-y-6">
            {/* Google Forms */}
            <div 
              className="p-6 rounded-xl border"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E5E7', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
            >
              <h3 className="mb-3" style={{ color: '#2A2E2F' }}>Configuración de Google Forms</h3>
              <div className="space-y-2 text-sm" style={{ color: '#666' }}>
                <p>• Crear un formulario con campo de carga de archivo</p>
                <p>• Configurar para guardar archivos en carpeta específica de Drive</p>
                <p>• Opcional: agregar campos para proveedor, número de factura, etc.</p>
                <p>• Generar enlace público del formulario</p>
              </div>
            </div>

            {/* Google Drive */}
            <div 
              className="p-6 rounded-xl border"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E5E7', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
            >
              <h3 className="mb-3" style={{ color: '#2A2E2F' }}>Organización en Google Drive</h3>
              <div className="space-y-2 text-sm" style={{ color: '#666' }}>
                <p>• Crear carpeta principal: "GeStock - Comprobantes"</p>
                <p>• Subcarpetas por mes o proveedor (opcional)</p>
                <p>• Configurar permisos de visualización</p>
                <p>• Obtener enlaces compartibles de cada archivo</p>
              </div>
            </div>

            {/* Integración con GeStock */}
            <div 
              className="p-6 rounded-xl border"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E3E5E7', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
            >
              <h3 className="mb-3" style={{ color: '#2A2E2F' }}>Integración con GeStock</h3>
              <div className="space-y-2 text-sm" style={{ color: '#666' }}>
                <p>• GeStock almacena solo el enlace de Drive (no el archivo)</p>
                <p>• Campo "photoUrl" en la base de datos de facturas</p>
                <p>• Vista previa mediante iframe o link externo</p>
                <p>• Botón "Abrir en Google Drive" para acceso directo</p>
              </div>
            </div>
          </div>
        </section>

        {/* Flujo del usuario */}
        <section className="mb-12">
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Flujo del usuario</h2>
          
          <div 
            className="p-6 rounded-xl border"
            style={{ backgroundColor: '#FBFBFB', borderColor: '#E3E5E7' }}
          >
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
                >
                  1
                </div>
                <div>
                  <p style={{ color: '#2A2E2F' }}>
                    El usuario hace clic en "Abrir formulario externo" al registrar una factura
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
                >
                  2
                </div>
                <div>
                  <p style={{ color: '#2A2E2F' }}>
                    Se abre Google Forms en una nueva pestaña
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
                >
                  3
                </div>
                <div>
                  <p style={{ color: '#2A2E2F' }}>
                    El usuario carga la foto de la factura y completa el formulario
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
                >
                  4
                </div>
                <div>
                  <p style={{ color: '#2A2E2F' }}>
                    Tras enviar, Google Drive genera un enlace al archivo
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
                >
                  5
                </div>
                <div>
                  <p style={{ color: '#2A2E2F' }}>
                    El usuario copia el enlace y lo pega en el campo "Enlace de la foto (Drive)" en GeStock
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ backgroundColor: '#4A90E2', color: '#FFFFFF' }}
                >
                  6
                </div>
                <div>
                  <p style={{ color: '#2A2E2F' }}>
                    La foto queda vinculada y aparece en la galería de comprobantes
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Mejoras futuras */}
        <section>
          <h2 className="mb-6" style={{ color: '#2A2E2F' }}>Mejoras futuras (opcionales)</h2>
          
          <div 
            className="p-6 rounded-xl border-2 border-dashed"
            style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
          >
            <div className="space-y-3 text-sm" style={{ color: '#666' }}>
              <p>• Integración con Google Drive API para sincronización automática</p>
              <p>• Webhook de Google Forms para notificar cuando se sube una foto</p>
              <p>• OCR automático para extraer datos de la factura</p>
              <p>• Migración a Google Cloud Storage para mayor control</p>
              <p>• Compresión automática de imágenes para optimizar espacio</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
