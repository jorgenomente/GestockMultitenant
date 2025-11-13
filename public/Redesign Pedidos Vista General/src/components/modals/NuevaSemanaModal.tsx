import { useState } from "react";
import { Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";

interface NuevaSemanaModalProps {
  open: boolean;
  onClose: () => void;
  onCreateWeek: (startDate: string, duplicateData: boolean) => void;
}

export function NuevaSemanaModal({ open, onClose, onCreateWeek }: NuevaSemanaModalProps) {
  const [startDate, setStartDate] = useState("");
  const [duplicateData, setDuplicateData] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate) {
      onCreateWeek(startDate, duplicateData);
      setStartDate("");
      setDuplicateData(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#0E2E2B]">Nueva semana</DialogTitle>
          <DialogDescription>
            Configura una nueva semana de pedidos para tu tienda
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de inicio</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10 rounded-xl border-gray-300"
                  required
                />
              </div>
              <p className="text-sm text-gray-500">
                Selecciona el lunes de inicio de la nueva semana
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="duplicate"
                checked={duplicateData}
                onCheckedChange={(checked) => setDuplicateData(checked === true)}
              />
              <Label
                htmlFor="duplicate"
                className="text-sm text-gray-700 cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Duplicar datos de la semana anterior
              </Label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-900">
                Al duplicar los datos, se copiarán todos los proveedores y sus configuraciones de
                la semana anterior. Los estados se reiniciarán a "Pendiente".
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-gray-300"
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#2FB6A0] hover:bg-[#2FB6A0]/90 rounded-xl">
              Crear semana
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}