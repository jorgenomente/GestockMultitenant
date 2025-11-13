import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { Supplier } from "../../App";

interface ProveedorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  supplier?: Supplier | null;
}

export function ProveedorModal({ open, onClose, onSave, supplier }: ProveedorModalProps) {
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: "",
    frequency: "semanal",
    orderDay: "Lunes",
    receiveDay: "Lunes",
    responsible: "",
    paymentMethod: "transferencia",
    status: "pendiente",
    orderDate: "",
  });

  useEffect(() => {
    if (supplier) {
      setFormData(supplier);
    } else {
      // Auto-generate date for new suppliers based on current week
      const today = new Date();
      const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      
      setFormData({
        name: "",
        frequency: "semanal",
        orderDay: "Lunes",
        receiveDay: "Lunes",
        responsible: "",
        paymentMethod: "transferencia",
        status: "pendiente",
        orderDate: formattedDate,
      });
    }
  }, [supplier, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.responsible) {
      onSave(formData as Supplier);
      onClose();
    }
  };

  const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#0E2E2B]">
            {supplier ? "Editar proveedor" : "Registrar proveedor"}
          </DialogTitle>
          <DialogDescription>
            {supplier
              ? "Modifica la información del proveedor"
              : "Completa los datos del nuevo proveedor"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del proveedor *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Abarrotes El Sol"
                className="rounded-xl border-gray-300"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frecuencia</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger className="rounded-xl border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderDay">Día de pedido</Label>
              <Select
                value={formData.orderDay}
                onValueChange={(value) => setFormData({ ...formData, orderDay: value })}
              >
                <SelectTrigger className="rounded-xl border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekdays.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiveDay">Día de recepción</Label>
              <Select
                value={formData.receiveDay}
                onValueChange={(value) => setFormData({ ...formData, receiveDay: value })}
              >
                <SelectTrigger className="rounded-xl border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekdays.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsible">Responsable *</Label>
              <Input
                id="responsible"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                placeholder="Ej: Jorge"
                className="rounded-xl border-gray-300"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de pago</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value: any) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger className="rounded-xl border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-gray-300"
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#2FB6A0] hover:bg-[#2FB6A0]/90 rounded-xl">
              {supplier ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}