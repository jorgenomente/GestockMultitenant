import { X, LayoutDashboard, TrendingUp, FileText, Settings as SettingsIcon, ChevronRight, User } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';

interface MoreDrawerProps {
  open: boolean;
  onClose: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  userName?: string;
  userRole?: string;
}

const drawerItems = [
  { 
    id: 'dashboard', 
    icon: LayoutDashboard, 
    label: 'Dashboard',
    description: 'Vista general y KPIs'
  },
  { 
    id: 'budget', 
    icon: TrendingUp, 
    label: 'Presupuesto',
    description: 'Análisis financiero'
  },
  { 
    id: 'reports', 
    icon: FileText, 
    label: 'Reportes',
    description: 'Informes y estadísticas'
  },
  { 
    id: 'settings', 
    icon: SettingsIcon, 
    label: 'Configuración',
    description: 'Ajustes del sistema'
  },
];

export function MoreDrawer({ 
  open, 
  onClose, 
  currentPage, 
  onNavigate,
  userName = 'Usuario',
  userRole = 'Operador'
}: MoreDrawerProps) {
  
  const handleNavigate = (page: string) => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    onNavigate(page);
    // Delay close slightly for visual feedback
    setTimeout(() => onClose(), 150);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[80vh] max-h-[600px] rounded-t-3xl border-t-2 px-0"
        style={{
          backgroundColor: '#3C4A44',
          borderTopColor: '#7DAA92',
        }}
      >
        <SheetHeader className="px-5 pb-4 border-b" style={{ borderColor: '#4B5B53' }}>
          <SheetTitle 
            className="text-lg m-0"
            style={{
              fontFamily: 'var(--font-family-heading)',
              color: '#F5F5F2',
              fontWeight: 600,
            }}
          >
            Más opciones
          </SheetTitle>
          <SheetDescription className="sr-only">
            Menú de opciones adicionales y navegación
          </SheetDescription>
          <div className="flex items-center justify-between absolute top-5 right-5">
            <button
              onClick={onClose}
              className="rounded-full p-2 active:scale-95 transition-all"
              style={{ backgroundColor: 'rgba(75, 91, 83, 0.5)' }}
            >
              <X className="w-5 h-5" style={{ color: '#F5F5F2' }} strokeWidth={2} />
            </button>
          </div>
        </SheetHeader>

        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(75vh - 180px)' }}>
          {/* User Info Card */}
          <div 
            className="mb-6 p-4 rounded-2xl border"
            style={{
              backgroundColor: '#2C3A33',
              borderColor: '#4B5B53',
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: '#7DAA92',
                  boxShadow: '0 2px 8px rgba(125, 170, 146, 0.4)'
                }}
              >
                <User className="w-6 h-6 text-[#F5F5F2]" strokeWidth={2} />
              </div>
              <div>
                <p 
                  className="m-0 text-base"
                  style={{
                    fontFamily: 'var(--font-family-heading)',
                    fontWeight: 600,
                    color: '#F5F5F2',
                  }}
                >
                  {userName}
                </p>
                <p 
                  className="m-0 text-sm"
                  style={{
                    color: '#B9BBB8',
                  }}
                >
                  {userRole}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="space-y-2">
            {drawerItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className="w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 active:scale-[0.98]"
                  style={{
                    backgroundColor: isActive ? 'rgba(125, 170, 146, 0.15)' : '#2C3A33',
                    border: isActive ? '1.5px solid #7DAA92' : '1px solid #4B5B53',
                    animation: `fadeInUp 0.2s ease-out ${index * 0.05}s both`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: isActive ? '#7DAA92' : 'rgba(125, 170, 146, 0.2)',
                      }}
                    >
                      <Icon 
                        className="w-5 h-5" 
                        style={{ 
                          color: '#F5F5F2',
                        }} 
                        strokeWidth={2}
                      />
                    </div>
                    <div className="text-left">
                      <p 
                        className="m-0 text-sm"
                        style={{
                          fontFamily: 'var(--font-family-heading)',
                          fontWeight: 600,
                          color: isActive ? '#7DAA92' : '#F5F5F2',
                        }}
                      >
                        {item.label}
                      </p>
                      <p 
                        className="m-0 text-xs"
                        style={{
                          color: '#B9BBB8',
                        }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight 
                    className="w-5 h-5" 
                    style={{ 
                      color: isActive ? '#C1643B' : 'rgba(31, 31, 31, 0.3)',
                    }} 
                    strokeWidth={2}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        <div 
          className="absolute bottom-0 left-0 right-0 p-5 border-t"
          style={{
            backgroundColor: '#3C4A44',
            borderTopColor: '#4B5B53',
          }}
        >
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl transition-all active:scale-[0.98]"
            style={{
              backgroundColor: '#2C3A33',
              color: '#F5F5F2',
              fontFamily: 'var(--font-family-heading)',
              fontWeight: 600,
              border: '1px solid #4B5B53'
            }}
          >
            Cerrar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
