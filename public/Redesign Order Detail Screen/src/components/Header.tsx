import { ArrowLeft, Copy, PackageCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface HeaderProps {
  supplier: string;
  frequency: string;
  dataSource: string;
  status: 'Pendiente' | 'Realizado';
  date: string;
  total: number;
  onBack: () => void;
  onDuplicate: () => void;
  onUpdateStock: () => void;
}

export function Header({
  supplier,
  frequency,
  dataSource,
  status,
  date,
  total,
  onBack,
  onDuplicate,
  onUpdateStock,
}: HeaderProps) {
  return (
    <div className="bg-white rounded-[16px] p-6 shadow-sm">
      {/* Title and Badges Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div className="flex-1">
          <h1 className="text-[#0E2E2B] mb-2">
            Pedido a {supplier}
          </h1>
          <p className="text-[#6B7280] mb-3">
            {frequency} · {dataSource}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={status === 'Realizado' ? 'default' : 'secondary'}
              className={status === 'Realizado' 
                ? 'bg-[#27AE60] hover:bg-[#229954] text-white border-0' 
                : 'bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border-0'
              }
            >
              {status}
            </Badge>
            <Badge variant="outline" className="border-[#EAEAEA] text-[#6B7280]">
              {date}
            </Badge>
          </div>
        </div>

        <div className="flex items-center">
          <div className="text-right">
            <p className="text-[#6B7280] text-sm mb-1">Total del pedido</p>
            <p className="text-[#27AE60]">
              ${total.toLocaleString('es-ES')}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-[#EAEAEA] text-[#0E2E2B] hover:bg-[#F3F4F6]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Regresar
        </Button>
        <Button
          variant="outline"
          onClick={onDuplicate}
          className="border-[#EAEAEA] text-[#0E2E2B] hover:bg-[#F3F4F6]"
        >
          <Copy className="w-4 h-4 mr-2" />
          Duplicar pedido
        </Button>
        <Button
          onClick={onUpdateStock}
          className="bg-[#27AE60] hover:bg-[#229954] text-white border-0"
        >
          <PackageCheck className="w-4 h-4 mr-2" />
          Actualizar stock
        </Button>
      </div>
    </div>
  );
}
