import { useState } from 'react';
import { ShoppingCart, DollarSign, Package, Clock, MoreHorizontal } from 'lucide-react';
import { cn } from './ui/utils';
import { MoreDrawer } from './MoreDrawer';

export type PageId = 'dashboard' | 'suppliers' | 'orders' | 'stock' | 'prices' | 'settings' | 'expirations' | 'budget' | 'reports';

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userName?: string;
  userRole?: string;
}

/**
 * Work Mode Navigation - Primary operational tools
 * 
 * Design Philosophy:
 * - 5 slots maximum for focused workflow
 * - Primary actions (Pedidos, Precios, Stock) get larger hit areas
 * - Secondary actions accessible but visually subordinate
 * - "Más" drawer for less-frequent administrative tasks
 * - Moss Green (#7DAA92) active states with rounded backgrounds
 * - Haptic feedback on interactions (mobile)
 */
const navItems = [
  { 
    id: 'orders', 
    icon: ShoppingCart, 
    label: 'Pedidos',
    primary: true,
    badge: 0 // Future: unread orders count
  },
  { 
    id: 'prices', 
    icon: DollarSign, 
    label: 'Precios',
    primary: true,
    badge: 0
  },
  { 
    id: 'stock', 
    icon: Package, 
    label: 'Stock',
    primary: true,
    badge: 0
  },
  { 
    id: 'expirations', 
    icon: Clock, 
    label: 'Vencimientos',
    primary: false,
    badge: 0 // Future: items expiring soon count
  },
];

export function BottomNav({ currentPage, onNavigate, userName, userRole }: BottomNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMoreTap = () => {
    // Haptic feedback simulation (would use navigator.vibrate in production)
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    setDrawerOpen(true);
  };

  const handleNavigate = (page: string) => {
    // Haptic feedback on tab change
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    onNavigate(page);
  };

  // Check if "Más" should be highlighted (when on a secondary page)
  const secondaryPages = ['dashboard', 'budget', 'reports', 'settings', 'suppliers'];
  const isMoreActive = secondaryPages.includes(currentPage);

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 md:hidden z-50"
        style={{
          backgroundColor: '#2C3A33',
          borderTop: '2px solid #4B5B53',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.4)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        }}
      >
        <div className="flex items-stretch justify-around px-1 pt-2 pb-1" style={{ minHeight: '70px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all duration-200 relative active:scale-95",
                  item.primary ? "flex-1 mx-0.5" : "flex-1 mx-0.5"
                )}
                style={{
                  backgroundColor: isActive ? 'rgba(125, 170, 146, 0.12)' : 'transparent',
                }}
              >
                {/* Icon Container */}
                <div 
                  className={cn(
                    "flex items-center justify-center rounded-xl relative",
                    item.primary ? "w-12 h-12" : "w-11 h-11"
                  )}
                  style={{
                    backgroundColor: isActive && item.primary ? '#7DAA92' : 'transparent',
                    transition: 'all 150ms ease-in-out',
                    boxShadow: isActive && item.primary ? '0 2px 8px rgba(125, 170, 146, 0.4)' : 'none'
                  }}
                >
                  <Icon 
                    className={item.primary ? "h-6 w-6" : "h-5 w-5"}
                    style={{ 
                      color: isActive && item.primary ? '#F5F5F2' : isActive ? '#7DAA92' : '#B9BBB8',
                      strokeWidth: isActive ? 2.5 : 2
                    }} 
                  />
                  {/* Active indicator dot */}
                  {isActive && !item.primary && (
                    <div 
                      className="absolute -top-1 right-0 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#7DAA92' }}
                    />
                  )}
                </div>
                
                {/* Label */}
                <span 
                  className="text-[10px] leading-tight text-center"
                  style={{ 
                    fontFamily: 'var(--font-family-body)',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#7DAA92' : '#B9BBB8'
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More Button */}
          <button
            onClick={handleMoreTap}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all duration-200 flex-1 mx-0.5 active:scale-95"
            )}
            style={{
              backgroundColor: isMoreActive ? 'rgba(125, 170, 146, 0.12)' : 'transparent',
            }}
          >
            <div 
              className="flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 relative"
            >
              <MoreHorizontal 
                className="h-5 w-5"
                style={{ 
                  color: isMoreActive ? '#7DAA92' : '#B9BBB8',
                  strokeWidth: isMoreActive ? 2.5 : 2
                }} 
              />
              {/* Active indicator dot */}
              {isMoreActive && (
                <div 
                  className="absolute -top-1 right-0 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: '#7DAA92' }}
                />
              )}
            </div>
            <span 
              className="text-[10px] leading-tight text-center"
              style={{ 
                fontFamily: 'var(--font-family-body)',
                fontWeight: isMoreActive ? 600 : 500,
                color: isMoreActive ? '#7DAA92' : '#B9BBB8'
              }}
            >
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* More Drawer */}
      <MoreDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentPage={currentPage}
        onNavigate={onNavigate}
        userName={userName}
        userRole={userRole}
      />
    </>
  );
}
