export type DemoExpiryItem = {
  id: string;
  name: string;
  expDate: string; // dd-mm-aa
  qty: number;
  freezer?: boolean;
  confirmed: boolean;
  updatedAt: string; // ISO string
};

export type DemoArchivedItem = {
  id: string;
  name: string;
  expDate: string;
  qty: number;
  freezer?: boolean;
  archivedAt: string;
};

export const DEMO_EXPIRY_ITEMS: DemoExpiryItem[] = [
  {
    id: "exp-yerba-1",
    name: "Yogur descremado durazno 1L",
    expDate: "28-04-24",
    qty: 12,
    confirmed: false,
    updatedAt: "2024-04-27T12:45:00-03:00",
  },
  {
    id: "exp-queso-1",
    name: "Queso brie reserva 200g",
    expDate: "02-05-24",
    qty: 6,
    confirmed: true,
    updatedAt: "2024-04-30T09:30:00-03:00",
  },
  {
    id: "exp-ensalada-1",
    name: "Ensalada ready-to-go mix verde",
    expDate: "01-05-24",
    qty: 18,
    freezer: false,
    confirmed: false,
    updatedAt: "2024-04-30T13:15:00-03:00",
  },
  {
    id: "exp-helado-1",
    name: "Helado crema americana 3L",
    expDate: "12-05-24",
    qty: 9,
    freezer: true,
    confirmed: true,
    updatedAt: "2024-04-29T11:10:00-03:00",
  },
  {
    id: "exp-fiambre-1",
    name: "Jamón cocido natural premium",
    expDate: "07-05-24",
    qty: 14,
    confirmed: false,
    updatedAt: "2024-04-29T18:25:00-03:00",
  },
  {
    id: "exp-leche-1",
    name: "Leche chocolatada light 1L",
    expDate: "22-05-24",
    qty: 20,
    confirmed: true,
    updatedAt: "2024-04-28T10:05:00-03:00",
  },
];

export const DEMO_EXPIRY_ARCHIVES: DemoArchivedItem[] = [
  {
    id: "arch-alfajor-1",
    name: "Alfajor de maicena artesanal",
    expDate: "14-04-24",
    qty: 8,
    archivedAt: "2024-04-15T17:32:00-03:00",
  },
  {
    id: "arch-jugo-1",
    name: "Jugo exprimido naranja 500ml",
    expDate: "18-04-24",
    qty: 5,
    archivedAt: "2024-04-19T09:20:00-03:00",
  },
];
