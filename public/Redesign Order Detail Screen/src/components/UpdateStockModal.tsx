import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { 
  CalendarIcon, 
  Info, 
  Package,
  X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { format } from 'date-fns@3.0.0';
import { es } from 'date-fns@3.0.0/locale';

interface ReceivedProduct {
  id: string;
  name: string;
  quantityOrdered: number;
  quantityReceived: number;
  currentStock: number;
  salesSinceDate: number;
  isNew?: boolean;
}

interface UpdateStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStock: (products: ReceivedProduct[], selectedDate: Date) => void;
  receivedProducts: ReceivedProduct[];
}

export function UpdateStockModal({
  isOpen,
  onClose,
  onApplyStock,
  receivedProducts,
}: UpdateStockModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handleAutoSelectDate = () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    setSelectedDate(sevenDaysAgo);
    toast.success('Fecha seleccionada automáticamente (últimos 7 días)');
  };

  const handleApply = () => {
    onApplyStock(receivedProducts, selectedDate);
    onClose();
    toast.success('Stock actualizado correctamente');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[480px] bg-white p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#EAEAEA]">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-[#0E2E2B] mb-1">
                <Package className="w-5 h-5 text-[#27AE60]" />
                Actualizar stock real
              </DialogTitle>
              <DialogDescription className="text-sm text-[#6B7280]">
                Aplicaremos el stock según las cantidades recibidas en este pedido.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-[#6B7280] hover:bg-[#F3F4F6] -mr-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Aviso explicativo */}
            <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
              <p className="text-sm text-[#6B7280] flex items-start gap-2">
                <Info className="w-4 h-4 text-[#6B7280] mt-0.5 flex-shrink-0" />
                <span>
                  Este paso solo se usa cuando la mercadería llega. No afecta el stock proyectado del pedido.
                </span>
              </p>
            </div>

            {/* Date selector */}
            <div className="space-y-3">
              <Label className="text-sm text-[#0E2E2B]">
                Fecha inicial para descontar ventas
              </Label>
              
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left border-[#EAEAEA] bg-white hover:border-[#27AE60]"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-[#6B7280]" />
                    <span className="text-[#0E2E2B] text-sm">
                      {format(selectedDate, "PPP 'a las' HH:mm", { locale: es })}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setIsDatePickerOpen(false);
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                onClick={handleAutoSelectDate}
                className="w-full border-[#EAEAEA] bg-white text-[#6B7280] hover:bg-[#F3F4F6]"
                size="sm"
              >
                Elegir automáticamente
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#EAEAEA] bg-[#F9FAFB]">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#EAEAEA] text-[#6B7280] hover:bg-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            className="bg-[#27AE60] text-white hover:bg-[#229954]"
          >
            Aplicar stock real
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}