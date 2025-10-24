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
    <div 
      className="h-16 border-b flex items-center justify-between px-8" 
      style={{ 
        borderColor: '#4B5B53', 
        backgroundColor: '#2C3A33',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div 
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: '#7DAA92',
            boxShadow: '0 2px 8px rgba(125, 170, 146, 0.4)'
          }}
        >
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
              color: '#F5F5F2',
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
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
            style={{ color: '#B9BBB8' }}
          />
          <Input
            placeholder="Buscar productos, proveedores..."
            className="pl-10 border rounded-lg"
            style={{ 
              fontSize: '0.875rem', 
              color: '#F5F5F2',
              backgroundColor: '#3C4A44',
              borderColor: '#4B5B53'
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative rounded-lg"
          style={{
            color: '#F5F5F2'
          }}
        >
          <Bell className="h-5 w-5" strokeWidth={1.5} />
          <span 
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ backgroundColor: '#C1643B' }}
          ></span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="gap-2 rounded-lg"
              style={{ color: '#F5F5F2' }}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback 
                  style={{ 
                    backgroundColor: '#7DAA92',
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
                  color: '#F5F5F2'
                }}
              >
                María Rodríguez
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56"
            style={{
              backgroundColor: '#3C4A44',
              borderColor: '#4B5B53',
              color: '#F5F5F2'
            }}
          >
            <DropdownMenuLabel style={{ color: '#F5F5F2' }}>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator style={{ backgroundColor: '#4B5B53' }} />
            <DropdownMenuItem style={{ color: '#F5F5F2' }}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem style={{ color: '#F5F5F2' }}>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator style={{ backgroundColor: '#4B5B53' }} />
            <DropdownMenuItem style={{ color: '#C1643B' }}>
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
