import { ChevronDown, Settings, User, Grid3x3, Table2, Calendar } from 'lucide-react';

interface HeaderProps {
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  onViewChange: (view: string) => void;
}

export function Header({ selectedBranch, onBranchChange, onViewChange }: HeaderProps) {
  return (
    <header className="bg-white border-b" style={{ borderColor: '#E3E5E7' }}>
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo y navegación */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#4A90E2' }}
              >
                <span className="text-white">GS</span>
              </div>
              <span style={{ color: '#2A2E2F' }}>GeStock</span>
            </div>

            {/* Navegación de desarrollo */}
            <nav className="flex items-center gap-4">
              <button
                onClick={() => onViewChange('main')}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{ color: '#2A2E2F' }}
              >
                Pagos
              </button>
              <button
                onClick={() => onViewChange('gallery')}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{ color: '#666' }}
              >
                Comprobantes
              </button>
              <button
                onClick={() => onViewChange('uikit')}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{ color: '#666' }}
              >
                UI Kit
              </button>
              <button
                onClick={() => onViewChange('flow')}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{ color: '#666' }}
              >
                Flujo Técnico
              </button>
            </nav>
          </div>

          {/* Controles derecha */}
          <div className="flex items-center gap-4">
            {/* Selector de sucursal */}
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all"
              style={{ borderColor: '#E3E5E7', color: '#2A2E2F' }}
            >
              <span className="text-sm">{selectedBranch}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Admin */}
            <button 
              className="p-2 rounded-lg border transition-all"
              style={{ borderColor: '#E3E5E7', color: '#2A2E2F' }}
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Usuario */}
            <button 
              className="p-2 rounded-lg border transition-all"
              style={{ borderColor: '#E3E5E7', color: '#2A2E2F' }}
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
