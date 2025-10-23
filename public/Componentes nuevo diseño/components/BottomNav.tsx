import { LayoutDashboard, Users, ShoppingCart, Package, Settings } from 'lucide-react';
import { cn } from './ui/utils';

export type PageId = 'dashboard' | 'suppliers' | 'orders' | 'stock' | 'settings';

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'suppliers', icon: Users, label: 'Proveedores' },
  { id: 'orders', icon: ShoppingCart, label: 'Pedidos' },
  { id: 'stock', icon: Package, label: 'Stock' },
  { id: 'settings', icon: Settings, label: 'Config' },
];

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 md:hidden z-50 safe-area-inset-bottom"
      style={{
        backgroundColor: '#F5F5F2',
        borderTop: '1px solid #E6DDC5',
        boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.08)'
      }}
    >
      <div className="flex items-center justify-around h-16 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200 min-w-[60px] active:scale-95",
                isActive && "bg-[#C1643B]/10"
              )}
            >
              <div 
                className={cn(
                  "flex items-center justify-center transition-all duration-200"
                )}
              >
                <Icon 
                  className="h-5 w-5" 
                  style={{ 
                    color: isActive ? '#C1643B' : '#5A8070',
                    strokeWidth: isActive ? 2.5 : 1.5
                  }} 
                />
              </div>
              <span 
                className="text-[10px] leading-tight text-center"
                style={{ 
                  fontFamily: 'var(--font-family-body)',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#C1643B' : '#5A8070'
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
