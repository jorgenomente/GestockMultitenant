import { useState } from 'react';
import { Search, Filter, FileText, FileCheck, FileX, ShoppingBag, ChevronLeft } from 'lucide-react';
import { DocumentIcon } from './ui/DocumentIcon';
import { PhotoPreviewModal } from './PhotoPreviewModal';

export function GalleryView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todos');
  const [previewImage, setPreviewImage] = useState<any>(null);

  const documents = [
    {
      id: '1',
      type: 'factura' as const,
      provider: 'Distribuidora del Norte S.A.',
      number: 'A-0001-00234567',
      amount: 45230.50,
      date: '2025-11-12',
      driveUrl: 'https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view'
    },
    {
      id: '2',
      type: 'remito' as const,
      provider: 'Comercial San Martín',
      number: 'R-0045-00012345',
      amount: 34200.75,
      date: '2025-11-08',
      driveUrl: 'https://drive.google.com/file/d/2b3c4d5e6f7g8h9i0j1k/view'
    },
    {
      id: '3',
      type: 'nota-credito' as const,
      provider: 'Mayorista Central',
      number: 'NC-0002-00001234',
      amount: 5600.00,
      date: '2025-11-10',
      driveUrl: 'https://drive.google.com/file/d/3c4d5e6f7g8h9i0j1k2l/view'
    },
    {
      id: '4',
      type: 'compra-local' as const,
      provider: 'Ferretería Local',
      number: 'CL-00456',
      amount: 12850.00,
      date: '2025-11-14',
      driveUrl: 'https://drive.google.com/file/d/4d5e6f7g8h9i0j1k2l3m/view'
    },
    {
      id: '5',
      type: 'factura' as const,
      provider: 'Importadora Global Ltda.',
      number: 'A-0003-00789012',
      amount: 62800.25,
      date: '2025-11-14',
      driveUrl: 'https://drive.google.com/file/d/5e6f7g8h9i0j1k2l3m4n/view'
    },
    {
      id: '6',
      type: 'factura' as const,
      provider: 'Proveedor Express S.R.L.',
      number: 'B-0008-00098765',
      amount: 18750.00,
      date: '2025-11-05',
      driveUrl: 'https://drive.google.com/file/d/6f7g8h9i0j1k2l3m4n5o/view'
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
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: '#2A2E2F' }}>Comprobantes</h1>
        <p className="text-sm" style={{ color: '#666' }}>
          Todas las fotos de facturas y documentos
        </p>
      </div>

      {/* Barra de filtros */}
      <div className="flex items-center gap-4 mb-6">
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar por proveedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border outline-none transition-all"
            style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF' }}
          />
        </div>

        {/* Filtros */}
        <select
          className="px-4 py-2 rounded-lg border outline-none cursor-pointer"
          style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF', color: '#2A2E2F' }}
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
        >
          <option value="todos">Todos los tipos</option>
          <option value="factura">Facturas</option>
          <option value="remito">Remitos</option>
          <option value="nota-credito">Notas de crédito</option>
          <option value="compra-local">Compras locales</option>
        </select>

        <select
          className="px-4 py-2 rounded-lg border outline-none cursor-pointer"
          style={{ borderColor: '#E3E5E7', backgroundColor: '#FFFFFF', color: '#2A2E2F' }}
        >
          <option>Noviembre 2025</option>
          <option>Octubre 2025</option>
          <option>Septiembre 2025</option>
        </select>
      </div>

      {/* Grilla de documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map(doc => (
          <div
            key={doc.id}
            onClick={() => setPreviewImage(doc)}
            className="bg-white rounded-xl p-5 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
            style={{ borderColor: '#E5E6E7', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            {/* Ícono del tipo */}
            <div className="mb-4">
              <DocumentIcon type={doc.type} size="lg" />
            </div>

            {/* Información */}
            <div className="space-y-2">
              <h3 className="mb-1" style={{ color: '#2A2E2F' }}>
                {doc.provider}
              </h3>
              <p className="text-sm" style={{ color: '#666' }}>
                {doc.type === 'factura' && 'Factura '}
                {doc.type === 'remito' && 'Remito '}
                {doc.type === 'nota-credito' && 'Nota de crédito '}
                {doc.type === 'compra-local' && 'Compra local '}
                {doc.number}
              </p>
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#E3E5E7' }}>
                <span className="text-sm" style={{ color: '#666' }}>
                  {formatDate(doc.date)}
                </span>
                <span style={{ color: '#2A2E2F' }}>
                  {formatAmount(doc.amount)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de preview */}
      {previewImage && (
        <PhotoPreviewModal
          document={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
