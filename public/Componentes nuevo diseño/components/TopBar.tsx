import { Search, Settings, Bell, User } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';

export function TopBar() {
  return (
    <div className="h-16 border-b flex items-center justify-between px-8 gestock-shadow" style={{ borderColor: '#D8D8D3', backgroundColor: '#FAFAF9' }}>
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#47685C] flex items-center justify-center">
          <span 
            style={{ 
              fontFamily: 'var(--font-family-heading)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#F5F5F2'
            }}
          >
            G
          </span>
        </div>
        <div>
          <h1 
            className="m-0" 
            style={{ 
              fontFamily: 'var(--font-family-heading)',
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1F1F1F',
              letterSpacing: '-0.01em'
            }}
          >
            GeStock
          </h1>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#5A8070]" />
          <Input
            placeholder="Buscar productos, proveedores..."
            className="pl-10 bg-[#F5F5F2] border-[#D8D8D3] focus:border-[#47685C] focus:ring-1 focus:ring-[#47685C]/20 rounded-lg"
            style={{ fontSize: '0.875rem', color: '#1F1F1F' }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative hover:bg-[#E6DDC5]/50 rounded-lg">
          <Bell className="h-5 w-5 text-[#47685C]" strokeWidth={1.5} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C1643B] rounded-full"></span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 hover:bg-[#E6DDC5]/50 rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarFallback 
                  style={{ 
                    backgroundColor: '#47685C',
                    color: '#F5F5F2',
                    fontFamily: 'var(--font-family-heading)',
                    fontSize: '0.8125rem',
                    fontWeight: 600
                  }}
                >
                  MR
                </AvatarFallback>
              </Avatar>
              <span 
                className="hidden md:inline"
                style={{ 
                  fontFamily: 'var(--font-family-body)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#1F1F1F'
                }}
              >
                María Rodríguez
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[#C1643B]">
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
