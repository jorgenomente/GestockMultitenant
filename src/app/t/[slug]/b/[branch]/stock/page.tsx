import { redirect } from "next/navigation";
import { paths } from "@/lib/paths";

type Params = { slug: string; branch: string };

export default async function BranchStockRedirect({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, branch } = await params;

  // El módulo de stock fue retirado; redireccionamos al tablero principal.
  redirect(paths.branch(slug, branch));
}

