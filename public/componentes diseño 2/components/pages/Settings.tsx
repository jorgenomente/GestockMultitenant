import { Save, Bell, Globe, Shield, Users, Building, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export function Settings() {
  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-family-heading)', marginBottom: '0.5rem' }}>
          Configuración
        </h1>
        <p className="text-muted-foreground m-0">
          Personaliza GeStock según las necesidades de tu negocio
        </p>
      </div>

      {/* Business Information */}
      <Card className="gestock-shadow">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-accent" />
            <div>
              <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
                Información del Negocio
              </CardTitle>
              <CardDescription>
                Datos principales de tu tienda
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business-name">Nombre del Negocio</Label>
              <Input id="business-name" defaultValue="Almacén Natural Palermo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-type">Tipo de Negocio</Label>
              <Select defaultValue="natural">
                <SelectTrigger id="business-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Tienda Natural</SelectItem>
                  <SelectItem value="market">Mercado Local</SelectItem>
                  <SelectItem value="organic">Orgánico</SelectItem>
                  <SelectItem value="grocery">Almacén</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" defaultValue="Av. Santa Fe 3421, Palermo, CABA" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" defaultValue="+54 11 4567-8900" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="contacto@almacenpalermo.com" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="gestock-shadow">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-accent" />
            <div>
              <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
                Notificaciones
              </CardTitle>
              <CardDescription>
                Configura cómo quieres recibir alertas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500 }}>
                Productos por vencer
              </div>
              <div className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                Recibe alertas cuando productos están próximos a vencer
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500 }}>
                Límite de presupuesto
              </div>
              <div className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                Alerta cuando superes el 80% del presupuesto semanal
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500 }}>
                Pedidos recibidos
              </div>
              <div className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                Confirma cuando un pedido ha sido recibido
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500 }}>
                Nuevos proveedores
              </div>
              <div className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                Notifica cuando se agrega un nuevo proveedor
              </div>
            </div>
            <Switch />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="notification-email">Email para notificaciones</Label>
            <div className="flex gap-2">
              <Input 
                id="notification-email" 
                type="email" 
                placeholder="notificaciones@almacen.com"
                className="flex-1"
              />
              <Button variant="outline">
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card className="gestock-shadow">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-accent" />
            <div>
              <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
                Configuración Regional
              </CardTitle>
              <CardDescription>
                Idioma, moneda y formato de fechas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
              <Select defaultValue="es">
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select defaultValue="ars">
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ars">ARS - Peso Argentino</SelectItem>
                  <SelectItem value="usd">USD - Dólar</SelectItem>
                  <SelectItem value="eur">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Zona Horaria</Label>
            <Select defaultValue="buenos-aires">
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buenos-aires">Buenos Aires (GMT-3)</SelectItem>
                <SelectItem value="santiago">Santiago (GMT-4)</SelectItem>
                <SelectItem value="sao-paulo">São Paulo (GMT-3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="gestock-shadow">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-accent" />
            <div>
              <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
                Seguridad
              </CardTitle>
              <CardDescription>
                Gestiona el acceso y la seguridad de tu cuenta
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500 }}>
                Autenticación de dos factores
              </div>
              <div className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                Agrega una capa extra de seguridad a tu cuenta
              </div>
            </div>
            <Switch />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Cambiar Contraseña</Label>
            <div className="space-y-3">
              <Input type="password" placeholder="Contraseña actual" />
              <Input type="password" placeholder="Nueva contraseña" />
              <Input type="password" placeholder="Confirmar nueva contraseña" />
              <Button variant="outline" className="w-full">
                Actualizar Contraseña
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Management */}
      <Card className="gestock-shadow">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-accent" />
            <div>
              <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
                Equipo
              </CardTitle>
              <CardDescription>
                Gestiona usuarios y permisos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <span style={{ fontFamily: 'var(--font-family-heading)' }}>MR</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-family-body)', fontWeight: 500 }}>
                  María Rodríguez
                </div>
                <div className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                  Admin · maria@almacen.com
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Gestionar
            </Button>
          </div>

          <Button variant="outline" className="w-full">
            <Users className="h-4 w-4 mr-2" />
            Invitar Miembro del Equipo
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancelar</Button>
        <Button className="gap-2 bg-accent hover:bg-accent/90">
          <Save className="h-4 w-4" />
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
