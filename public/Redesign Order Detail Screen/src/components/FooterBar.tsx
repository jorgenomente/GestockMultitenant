import { useState, useEffect } from 'react';
import { FileText, Copy, Download, Package } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface FooterBarProps {
  totalUnits: number;
  total: number;
  onExport: (type: string) => void;
}

export function FooterBar({ totalUnits, total, onExport }: FooterBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-[#EAEAEA] shadow-lg transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Total Units */}
          <div className="flex items-center gap-2 text-[#0E2E2B]">
            <Package className="w-5 h-5 text-[#6B7280]" />
            <span className="hidden sm:inline">Total unidades:</span>
            <span className="sm:hidden">Unidades:</span>
            <span>{totalUnits}</span>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-[#EAEAEA] text-[#0E2E2B] hover:bg-[#F3F4F6]"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                <DropdownMenuItem onClick={() => onExport('pdf')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar como PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('excel')}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar como Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('csv')}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar como CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              onClick={() => onExport('clipboard')}
              className="border-[#EAEAEA] text-[#0E2E2B] hover:bg-[#F3F4F6]"
            >
              <Copy className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Copiar</span>
            </Button>
          </div>

          {/* Total Amount */}
          <div className="bg-[#27AE60] text-white px-6 py-3 rounded-xl shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm opacity-90">Total a pagar</span>
              <span className="text-xl lg:text-2xl">${total.toLocaleString('es-ES')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
