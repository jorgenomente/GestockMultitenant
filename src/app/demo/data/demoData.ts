export const DASHBOARD_METRICS = [
  {
    label: "Ventas del mes",
    value: "$4,2M",
    delta: "+12%",
    trend: "up" as const,
    context: "vs. abril 2024",
  },
  {
    label: "Margen bruto",
    value: "38,6%",
    delta: "+3,1 pts",
    trend: "up" as const,
    context: "Objetivo: 36%",
  },
  {
    label: "Inventario útil",
    value: "24 días",
    delta: "-4 días",
    trend: "down" as const,
    context: "Cobertura promedio",
  },
];

export const DASHBOARD_EXPIRIES = [
  {
    product: "Yogur descremado 1L",
    branch: "Sucursal Norte",
    expiresIn: "7 días",
    risk: "Alerta temprana",
  },
  {
    product: "Jamón cocido premium",
    branch: "Casa Central",
    expiresIn: "12 días",
    risk: "Reposicionar en góndola",
  },
  {
    product: "Queso brie 200g",
    branch: "Mayorista",
    expiresIn: "15 días",
    risk: "Activar promoción 2x1",
  },
];

export const DASHBOARD_ACTIVITY = [
  {
    title: "Pedido #PO-1042 listo para facturar",
    subtitle: "Proveedor Arcor | 1.280 unidades",
    timeAgo: "hace 8 min",
  },
  {
    title: "Precio actualizado: Yerba Campo Sur",
    subtitle: "+6% vs. costo mayorista | margen 34%",
    timeAgo: "hace 42 min",
  },
  {
    title: "Nueva lista aprobada",
    subtitle: "Sucursal Sur | 154 productos sincronizados",
    timeAgo: "hace 3 h",
  },
];

export const DASHBOARD_SERIES = [
  { channel: "Casa Central", value: 82, note: "+18% crecimiento" },
  { channel: "Sucursal Norte", value: 64, note: "+9% crecimiento" },
  { channel: "Mayorista", value: 51, note: "+5% crecimiento" },
];

export const DEMO_PRODUCTS = [
  {
    name: "Yerba Campo Sur 1Kg",
    sku: "YER-1042",
    branch: "Casa Central",
    currentPrice: "$1.980",
    suggestedPrice: "$2.070",
    margin: "34%",
    status: "Actualizado",
    updatedAt: "Hace 2 h",
  },
  {
    name: "Aceite de oliva Patagonia 500ml",
    sku: "ACE-2081",
    branch: "Sucursal Norte",
    currentPrice: "$3.150",
    suggestedPrice: "$3.290",
    margin: "29%",
    status: "Para revisar",
    updatedAt: "Ayer",
  },
  {
    name: "Queso cremoso Los Andes 3Kg",
    sku: "LAC-3001",
    branch: "Mayorista",
    currentPrice: "$5.420",
    suggestedPrice: "$5.680",
    margin: "21%",
    status: "Vence lista",
    updatedAt: "Hace 4 h",
  },
  {
    name: "Café tostado Intenso 500g",
    sku: "CAF-5510",
    branch: "Casa Central",
    currentPrice: "$4.390",
    suggestedPrice: "$4.580",
    margin: "32%",
    status: "Actualizado",
    updatedAt: "Hace 35 min",
  },
];

export const INVENTORY_LEVELS = [
  {
    category: "Lácteos y frescos",
    coverageDays: 18,
    status: "Reponer próximamente",
    health: 58,
  },
  {
    category: "Almacén y secos",
    coverageDays: 35,
    status: "Óptimo",
    health: 86,
  },
  {
    category: "Bebidas y bodega",
    coverageDays: 27,
    status: "Revisión semanal",
    health: 72,
  },
];

export const LOW_STOCK_ALERTS = [
  {
    product: "Manteca colonial 200g",
    branch: "Sucursal Norte",
    stock: "12 uds",
    action: "Ajustar pedido",
  },
  {
    product: "Fideos integrales 500g",
    branch: "Casa Central",
    stock: "28 uds",
    action: "Simular reposición",
  },
  {
    product: "Energizante Citrus 470ml",
    branch: "Mayorista",
    stock: "18 uds",
    action: "Combinar con promo",
  },
];

export const DEMO_ORDERS = [
  {
    code: "PO-1042",
    supplier: "Distribuidora Arcor",
    eta: "3 mayo",
    status: "En tránsito",
    progress: 72,
    items: "8 referencias",
  },
  {
    code: "PO-1038",
    supplier: "La Serenísima",
    eta: "2 mayo",
    status: "Preparando despacho",
    progress: 54,
    items: "12 referencias",
  },
  {
    code: "PO-1034",
    supplier: "Molinos Río de la Plata",
    eta: "Entregado",
    status: "Recepcionado",
    progress: 100,
    items: "6 referencias",
  },
];

export const DEMO_PROVIDER_WEEKS = [
  {
    id: "week-2024-18",
    label: "29 abr – 5 may",
    weekStart: "2024-04-29",
  },
  {
    id: "week-2024-17",
    label: "22 – 28 abr",
    weekStart: "2024-04-22",
  },
  {
    id: "week-2024-16",
    label: "15 – 21 abr",
    weekStart: "2024-04-15",
  },
];

export const DEMO_PROVIDERS = [
  {
    id: "prov-demo-1",
    name: "La Serenísima",
    freq: "SEMANAL",
    orderDay: 1,
    receiveDay: 3,
    responsible: "Mariana Díaz",
    status: "PENDIENTE",
    paymentMethod: "TRANSFERENCIA",
    summary: { total: 256800, items: 128, updatedAt: "2024-04-28T13:30:00-03:00" },
    lastAddedAt: "2024-04-29T08:15:00-03:00",
  },
  {
    id: "prov-demo-2",
    name: "Distribuidora Arcor",
    freq: "SEMANAL",
    orderDay: 1,
    receiveDay: 3,
    responsible: "Carla Torres",
    status: "PENDIENTE",
    paymentMethod: "TRANSFERENCIA",
    summary: { total: 198450, items: 92, updatedAt: "2024-04-27T17:20:00-03:00" },
    lastAddedAt: "2024-04-28T12:02:00-03:00",
  },
  {
    id: "prov-demo-3",
    name: "Molinos Río de la Plata",
    freq: "QUINCENAL",
    orderDay: 2,
    receiveDay: 4,
    responsible: "Javier Núñez",
    status: "REALIZADO",
    paymentMethod: "TRANSFERENCIA",
    summary: { total: 152300, items: 64, updatedAt: "2024-04-25T10:05:00-03:00" },
    lastAddedAt: "2024-04-25T10:15:00-03:00",
  },
  {
    id: "prov-demo-4",
    name: "Granja Don Julio",
    freq: "SEMANAL",
    orderDay: 0,
    receiveDay: 2,
    responsible: "Ignacio López",
    status: "PENDIENTE",
    paymentMethod: "EFECTIVO",
    summary: { total: 84600, items: 48, updatedAt: "2024-04-28T09:40:00-03:00" },
    lastAddedAt: "2024-04-29T07:45:00-03:00",
  },
  {
    id: "prov-demo-5",
    name: "Bebidas Patagonia",
    freq: "MENSUAL",
    orderDay: 4,
    receiveDay: 5,
    responsible: "Tomás Peretti",
    status: "PENDIENTE",
    paymentMethod: "TRANSFERENCIA",
    summary: { total: 289700, items: 115, updatedAt: "2024-04-20T15:15:00-03:00" },
    lastAddedAt: "2024-04-20T15:20:00-03:00",
  },
  {
    id: "prov-demo-6",
    name: "Cervecería Andina",
    freq: "SEMANAL",
    orderDay: 3,
    receiveDay: 5,
    responsible: "Sofía Quiroga",
    status: "REALIZADO",
    paymentMethod: "EFECTIVO",
    summary: { total: 103900, items: 56, updatedAt: "2024-04-26T19:45:00-03:00" },
    lastAddedAt: "2024-04-26T20:05:00-03:00",
  },
  {
    id: "prov-demo-7",
    name: "Frutas Andinas",
    freq: "SEMANAL",
    orderDay: 5,
    receiveDay: 6,
    responsible: "Gabriela Muñoz",
    status: "PENDIENTE",
    paymentMethod: "EFECTIVO",
    summary: { total: 67420, items: 38, updatedAt: "2024-04-27T08:20:00-03:00" },
    lastAddedAt: "2024-04-27T08:30:00-03:00",
  },
  {
    id: "prov-demo-8",
    name: "Lácteos Campo Sur",
    freq: "QUINCENAL",
    orderDay: 1,
    receiveDay: 2,
    responsible: "Marcos Rivas",
    status: "REALIZADO",
    paymentMethod: "TRANSFERENCIA",
    summary: { total: 118900, items: 52, updatedAt: "2024-04-18T11:10:00-03:00" },
    lastAddedAt: "2024-04-18T11:12:00-03:00",
  },
];

export type DemoProviderOrderHighlight = {
  label: string;
  value: string;
  context?: string;
};

export type DemoProviderOrderChecklist = {
  id: string;
  label: string;
  done?: boolean;
};

export type DemoProviderOrderItem = {
  id: string;
  name: string;
  category: string;
  sku?: string;
  presentation?: string;
  orderedQty: number;
  suggestedQty?: number;
  unit?: string;
  status: "pendiente" | "listo" | "revisar";
  comment?: string;
  stats?: {
    avg4w?: number;
    sum2w?: number;
    sum30d?: number;
    lastQty?: number;
    lastDate?: string;
    lastUnitCost?: string;
  };
};

export type DemoProviderOrderGroup = {
  id: string;
  name: string;
  focus?: string;
  notes?: string;
  items: DemoProviderOrderItem[];
};

export type DemoProviderOrder = {
  providerId: string;
  providerName: string;
  reference: string;
  branch: string;
  eta: string;
  statusLabel: string;
  statusVariant: "default" | "secondary" | "outline" | "destructive";
  highlights: DemoProviderOrderHighlight[];
  checklist: DemoProviderOrderChecklist[];
  groups: DemoProviderOrderGroup[];
  notes?: string;
};

export const DEMO_PROVIDER_ORDERS: Record<string, DemoProviderOrder> = {
  "prov-demo-1": {
    providerId: "prov-demo-1",
    providerName: "La Serenísima",
    reference: "Pedido #PO-2314",
    branch: "Casa Central",
    eta: "Entrega confirmada · 2 mayo 08:30 hs",
    statusLabel: "En tránsito",
    statusVariant: "secondary",
    highlights: [
      { label: "Líneas", value: "14", context: "8 con reposición automática" },
      { label: "Ticket estimado", value: "$256.800", context: "+6% vs. semana pasada" },
      { label: "Cobertura", value: "5.4 días", context: "Stock fresco hasta el domingo" },
    ],
    checklist: [
      { id: "recepcion", label: "Confirmar recepción en cámara de frío" },
      { id: "factura", label: "Adjuntar factura electrónica", done: true },
      { id: "lot-track", label: "Actualizar lotes críticos para vencimientos" },
    ],
    groups: [
      {
        id: "lacteos",
        name: "Lácteos premium",
        focus: "Rotación alta para desayunos y bandejas ready-to-go",
        items: [
          {
            id: "item-queso-tybo",
            name: "Queso tybo barra 3kg",
            category: "Frescos · Línea profesional",
            sku: "LAC-9821",
            presentation: "Caja x1",
            orderedQty: 12,
            suggestedQty: 10,
            unit: "unidades",
            status: "pendiente",
            comment: "Se agrega buffer por evento corporativo",
            stats: {
              avg4w: 9,
              sum2w: 18,
              lastQty: 10,
              lastDate: "22 abr",
              lastUnitCost: "$8.200",
            },
          },
          {
            id: "item-muzzarella",
            name: "Muzzarella barra seleccionada",
            category: "Pizzería y pastelería",
            sku: "LAC-7712",
            presentation: "Caja x4",
            orderedQty: 8,
            suggestedQty: 8,
            unit: "cajas",
            status: "listo",
            stats: {
              avg4w: 7,
              sum2w: 15,
              lastQty: 8,
              lastDate: "15 abr",
              lastUnitCost: "$6.450",
            },
          },
          {
            id: "item-ricota",
            name: "Ricota artesanal 1kg",
            category: "Panificados y pastelería",
            sku: "LAC-5520",
            presentation: "Maple x10",
            orderedQty: 6,
            suggestedQty: 5,
            unit: "maples",
            status: "revisar",
            comment: "Revisar shelf life: vence en 7 días",
            stats: {
              avg4w: 4,
              sum2w: 9,
              sum30d: 19,
              lastDate: "26 abr",
              lastUnitCost: "$1.280",
            },
          },
        ],
      },
      {
        id: "yogures",
        name: "Yogures funcionales",
        focus: "Mix saludable para canal mayorista y autoservicio",
        items: [
          {
            id: "item-yogur-bebe",
            name: "Yogur descremado bebible 1L",
            category: "Healthy · Mayorista",
            orderedQty: 24,
            suggestedQty: 24,
            unit: "packs",
            status: "pendiente",
            stats: {
              avg4w: 22,
              sum2w: 45,
              lastQty: 24,
              lastDate: "29 abr",
              lastUnitCost: "$1.460",
            },
          },
          {
            id: "item-kefir",
            name: "Kéfir probiótico 300ml",
            category: "Góndola saludable",
            orderedQty: 18,
            suggestedQty: 15,
            unit: "packs",
            status: "revisar",
            comment: "Sumar tasting en Sucursal Norte",
            stats: {
              avg4w: 12,
              sum2w: 20,
              sum30d: 42,
              lastDate: "23 abr",
            },
          },
        ],
      },
      {
        id: "postres",
        name: "Postres y repostería",
        focus: "SKU con mejor margen para la semana del día de la madre",
        items: [
          {
            id: "item-flan",
            name: "Flan clásico individual",
            category: "Impulsivo",
            orderedQty: 36,
            suggestedQty: 32,
            unit: "cajas",
            status: "pendiente",
            stats: {
              avg4w: 30,
              sum2w: 60,
              lastQty: 34,
              lastDate: "20 abr",
            },
          },
          {
            id: "item-dulce-leche",
            name: "Dulce de leche repostero 5kg",
            category: "Pastelería",
            orderedQty: 10,
            suggestedQty: 10,
            unit: "baldes",
            status: "listo",
            stats: {
              avg4w: 9,
              sum2w: 18,
              lastQty: 10,
              lastDate: "18 abr",
              lastUnitCost: "$4.520",
            },
          },
        ],
      },
    ],
    notes: "El proveedor confirmó un ajuste de precios del 3,5% efectivo desde el 10/05. Sin impactos logísticos previstos.",
  },
  "prov-demo-2": {
    providerId: "prov-demo-2",
    providerName: "Distribuidora Arcor",
    reference: "Pedido #PO-2281",
    branch: "Sucursal Norte",
    eta: "Preparando despacho · llega 3 mayo 14:00 hs",
    statusLabel: "Preparando despacho",
    statusVariant: "outline",
    highlights: [
      { label: "Líneas", value: "22", context: "4 promociones activas" },
      { label: "Ticket estimado", value: "$198.450", context: "Ajustado por bonificación 3x2" },
      { label: "Cobertura", value: "7.1 días", context: "Canal autoservicio" },
    ],
    checklist: [
      { id: "promo", label: "Revisar precios de combo golosinas" },
      { id: "carteleria", label: "Actualizar cartelería POP" },
      { id: "rotacion", label: "Documentar rotación semanal" },
    ],
    groups: [
      {
        id: "chocolates",
        name: "Chocolates y impulsivos",
        items: [
          {
            id: "item-choco-bitter",
            name: "Chocolate bitter 80g",
            category: "Premium",
            orderedQty: 48,
            suggestedQty: 40,
            unit: "cajas",
            status: "pendiente",
            comment: "Sumar frente adicional en góndola fría",
            stats: {
              avg4w: 42,
              sum2w: 84,
              lastQty: 38,
              lastDate: "25 abr",
            },
          },
          {
            id: "item-bocaditos",
            name: "Bocaditos de dulce de leche",
            category: "Impulsivo",
            orderedQty: 60,
            suggestedQty: 50,
            unit: "cajas",
            status: "listo",
            stats: {
              avg4w: 55,
              sum2w: 110,
              lastQty: 60,
              lastDate: "27 abr",
            },
          },
        ],
      },
      {
        id: "snacks",
        name: "Snacks salados",
        items: [
          {
            id: "item-papas-gourmet",
            name: "Papas gourmet 120g",
            category: "Salados",
            orderedQty: 72,
            suggestedQty: 72,
            unit: "cajas",
            status: "pendiente",
            stats: {
              avg4w: 68,
              sum2w: 136,
              lastQty: 70,
            },
          },
        ],
      },
    ],
  },
  "prov-demo-3": {
    providerId: "prov-demo-3",
    providerName: "Molinos Río de la Plata",
    reference: "Pedido #PO-2269",
    branch: "Mayorista",
    eta: "Entregado · 30 abr 16:30 hs",
    statusLabel: "Recepcionado",
    statusVariant: "default",
    highlights: [
      { label: "Líneas", value: "18" },
      { label: "Ticket estimado", value: "$152.300" },
      { label: "Cobertura", value: "11 días" },
    ],
    checklist: [
      { id: "inventario", label: "Confirmar diferencias en secos" },
      { id: "facturacion", label: "Sincronizar factura en ERP", done: true },
    ],
    groups: [
      {
        id: "harinas",
        name: "Harinas y premezclas",
        items: [
          {
            id: "item-harina-0000",
            name: "Harina 0000 25kg",
            category: "Secos",
            orderedQty: 40,
            suggestedQty: 38,
            unit: "bolsas",
            status: "listo",
            stats: {
              avg4w: 36,
              sum2w: 70,
              lastQty: 40,
            },
          },
        ],
      },
    ],
  },
};

export const DEMO_PROVIDER_ORDER_FALLBACK: DemoProviderOrder = {
  providerId: "prov-demo-fallback",
  providerName: "Proveedor demo",
  reference: "Pedido demo",
  branch: "Sucursal demo",
  eta: "Entrega estimada dentro de la semana",
  statusLabel: "Pendiente",
  statusVariant: "destructive",
  highlights: [
    { label: "Líneas", value: "8" },
    { label: "Ticket estimado", value: "$95.000" },
    { label: "Cobertura", value: "4 días" },
  ],
  checklist: [
    { id: "demo-check-1", label: "Marcar ejemplos de recepción" },
  ],
  groups: [
    {
      id: "demo-group",
      name: "Productos destacados",
      items: [
        {
          id: "demo-item",
          name: "Producto demo",
          category: "Categoría ficticia",
          orderedQty: 10,
          status: "pendiente",
          stats: { avg4w: 8, sum2w: 16 },
        },
      ],
    },
  ],
};

export const EXPIRY_LOTS = [
  {
    product: "Yogur descremado durazno",
    lot: "L-2391",
    branch: "Sucursal Norte",
    expiresIn: "7 días",
    coverage: "72% vendido",
    priority: "Alta",
  },
  {
    product: "Ensalada ready-to-go",
    lot: "L-2388",
    branch: "Casa Central",
    expiresIn: "5 días",
    coverage: "45% vendido",
    priority: "Crítica",
  },
  {
    product: "Leche chocolatada light",
    lot: "L-2397",
    branch: "Mayorista",
    expiresIn: "11 días",
    coverage: "63% vendido",
    priority: "Media",
  },
];

export type DemoPriceItem = {
  id: string;
  name: string;
  code?: string;
  barcode?: string;
  price: number;
  updatedAt: string;
  updatedAtLabel: string;
};

export const DEMO_PRICE_ITEMS: DemoPriceItem[] = [
  {
    id: "price-yerba-campo-sur",
    name: "Yerba Campo Sur 1Kg",
    code: "YER-1042",
    barcode: "7790000123456",
    price: 1980,
    updatedAt: "2024-05-02T10:30:00-03:00",
    updatedAtLabel: "02/05/2024 10:30",
  },
  {
    id: "price-aceite-patagonia",
    name: "Aceite de oliva Patagonia 500ml",
    code: "ACE-2081",
    barcode: "7791234098765",
    price: 3150,
    updatedAt: "2024-05-01T18:45:00-03:00",
    updatedAtLabel: "01/05/2024 18:45",
  },
  {
    id: "price-queso-andes",
    name: "Queso cremoso Los Andes 3Kg",
    code: "LAC-3001",
    barcode: "7794567012345",
    price: 5420,
    updatedAt: "2024-05-03T08:55:00-03:00",
    updatedAtLabel: "03/05/2024 08:55",
  },
  {
    id: "price-cafe-intenso",
    name: "Café tostado Intenso 500g",
    code: "CAF-5510",
    barcode: "7795555012340",
    price: 4390,
    updatedAt: "2024-05-02T15:10:00-03:00",
    updatedAtLabel: "02/05/2024 15:10",
  },
  {
    id: "price-galletitas-avenas",
    name: "Galletitas de avena integral",
    code: "GAL-8821",
    barcode: "7798888123450",
    price: 980,
    updatedAt: "2024-04-30T11:05:00-03:00",
    updatedAtLabel: "30/04/2024 11:05",
  },
  {
    id: "price-bebida-isotonica",
    name: "Bebida isotónica citrus 500ml",
    code: "BEB-4412",
    barcode: "7794412007788",
    price: 1250,
    updatedAt: "2024-04-29T09:15:00-03:00",
    updatedAtLabel: "29/04/2024 09:15",
  },
];
