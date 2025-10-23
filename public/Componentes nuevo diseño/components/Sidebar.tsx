import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Package, 
  Calendar, 
  DollarSign, 
  BarChart3, 
  Settings,
  ChevronLeft
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'suppliers', label: 'Proveedores', icon: Users },
  { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'expirations', label: 'Vencimientos', icon: Calendar },
  { id: 'budget', label: 'Presupuesto', icon: DollarSign },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

export function Sidebar({ currentPage, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <div 
      className={cn(
        "h-full border-r flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ borderColor: '#1F3340', backgroundColor: '#2C4653' }}
    >
      <div className="flex-1 py-6">
        <nav className="space-y-0.5 px-3">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 transition-all",
                  isActive 
                    ? "bg-[#47685C] text-[#F5F5F2] border-l-2 border-l-[#A9C9A4] rounded-l-none" 
                    : "text-[#F5F5F2]/70 hover:text-[#F5F5F2] hover:bg-[#3D5B6B] border-l-2 border-l-transparent",
                  collapsed && "justify-center px-2"
                )}
                style={{
                  fontFamily: 'var(--font-family-body)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500
                }}
                onClick={() => onNavigate(item.id)}
              >
                <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t" style={{ borderColor: '#1F3340' }}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className={cn(
            "w-full text-[#F5F5F2]/70 hover:text-[#F5F5F2] hover:bg-[#3D5B6B]", 
            !collapsed && "justify-start px-3"
          )}
          style={{ fontSize: '0.875rem' }}
        >
          <ChevronLeft 
            className={cn(
              "h-5 w-5 transition-transform",
              collapsed && "rotate-180"
            )} 
          />
          {!collapsed && <span className="ml-2">Contraer</span>}
        </Button>
      </div>
    </div>
  );
}
