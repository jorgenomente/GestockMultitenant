// scripts/import-products.ts
import "dotenv/config";
import { prisma } from "../server/prisma-multi";
import fs from "node:fs";
import path from "node:path";

type Row = { name: string; packSize?: number; price?: number; stock?: number };

async function main() {
  const tenantSlug = process.env.DEFAULT_TENANT_SLUG || "demo";
  const csvPath = path.join(process.cwd(), "data", "products.csv");
  const csv = fs.readFileSync(csvPath, "utf8").trim().split("\n");
  const rows: Row[] = csv.slice(1).map((line) => {
    const [name, packSize, price, stock] = line.split(",");
    return { name, packSize: Number(packSize), price: Number(price), stock: Number(stock) };
  });

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error("Tenant no existe");

  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      await tx.product.upsert({
        where: { // si tenés unique(name, tenant_id), usa un ID lógico
          // @ts-ignore (ejemplo; ajusta a tu unique real)
          name_tenantId: { name: r.name, tenantId: tenant.id },
        },
        update: { packSize: r.packSize ?? 1, price: r.price ?? 0, stock: r.stock ?? 0 },
        create: {
          tenantId: tenant.id,
          name: r.name,
          packSize: r.packSize ?? 1,
          price: r.price ?? 0,
          stock: r.stock ?? 0,
        },
      });
    }
  });

  console.log("✅ Import OK");
}

main().catch((e) => { console.error(e); process.exit(1); });
