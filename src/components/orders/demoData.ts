export type DemoSalesRow = {
  product: string;
  qty: number;
  date: number;
  subtotal?: number;
  unitPrice?: number;
};

type DemoSalesEntry = [string, DemoSalesRow[]];

const toMs = (isoDate: string) => new Date(`${isoDate}T03:00:00Z`).getTime();

const DEMO_SALES_ENTRIES: DemoSalesEntry[] = [
  [
    "Aceite de oliva Patagonia 500ml",
    [
      {
        product: "Aceite de oliva Patagonia 500ml",
        qty: 18,
        date: toMs("2024-05-02"),
        subtotal: 22680,
        unitPrice: 1260,
      },
      {
        product: "Aceite de oliva Patagonia 500ml",
        qty: 22,
        date: toMs("2024-04-22"),
        subtotal: 27720,
        unitPrice: 1260,
      },
      {
        product: "Aceite de oliva Patagonia 500ml",
        qty: 16,
        date: toMs("2024-04-08"),
        subtotal: 20160,
        unitPrice: 1260,
      },
      {
        product: "Aceite de oliva Patagonia 500ml",
        qty: 24,
        date: toMs("2024-03-25"),
        subtotal: 29520,
        unitPrice: 1230,
      },
    ],
  ],
  [
    "Harina 000 Molino Andino 1Kg",
    [
      {
        product: "Harina 000 Molino Andino 1Kg",
        qty: 48,
        date: toMs("2024-05-03"),
        subtotal: 12480,
        unitPrice: 260,
      },
      {
        product: "Harina 000 Molino Andino 1Kg",
        qty: 60,
        date: toMs("2024-04-26"),
        subtotal: 15600,
        unitPrice: 260,
      },
      {
        product: "Harina 000 Molino Andino 1Kg",
        qty: 42,
        date: toMs("2024-04-12"),
        subtotal: 10500,
        unitPrice: 250,
      },
      {
        product: "Harina 000 Molino Andino 1Kg",
        qty: 54,
        date: toMs("2024-03-29"),
        subtotal: 13500,
        unitPrice: 250,
      },
    ],
  ],
  [
    "Vino Malbec Reserva 750ml",
    [
      {
        product: "Vino Malbec Reserva 750ml",
        qty: 12,
        date: toMs("2024-05-01"),
        subtotal: 31200,
        unitPrice: 2600,
      },
      {
        product: "Vino Malbec Reserva 750ml",
        qty: 15,
        date: toMs("2024-04-18"),
        subtotal: 38250,
        unitPrice: 2550,
      },
      {
        product: "Vino Malbec Reserva 750ml",
        qty: 10,
        date: toMs("2024-04-02"),
        subtotal: 25000,
        unitPrice: 2500,
      },
      {
        product: "Vino Malbec Reserva 750ml",
        qty: 18,
        date: toMs("2024-03-15"),
        subtotal: 43200,
        unitPrice: 2400,
      },
    ],
  ],
];

export function createDemoSalesMap(): Map<string, DemoSalesRow[]> {
  return new Map(
    DEMO_SALES_ENTRIES.map(([key, rows]) => [key, rows.map((row) => ({ ...row }))])
  );
}
