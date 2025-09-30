import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  const bucket = process.env.SUPABASE_BUCKET || "config";

  const envOk = Boolean(url && key);
  let bucketOk = false;
  let canWrite = false;

  try {
    if (envOk) {
      const s = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
      // listar objetos (puede devolver vacío pero no debería fallar si el bucket existe)
      const list = await s.storage.from(bucket).list("", { limit: 1 });
      bucketOk = !list.error;

      // prueba de escritura SI el bucket existe (no guarda nada sensible)
      if (bucketOk) {
        const pingKey = `precios/health/ping-${Date.now()}.txt`;
        const up = await s.storage.from(bucket).upload(pingKey, "ok", { upsert: true, contentType: "text/plain" });
        canWrite = !up.error;
        // cleanup best-effort
        await s.storage.from(bucket).remove([pingKey]);
      }
    }
  } catch {}

  return NextResponse.json({
    envOk,
    bucket,
    bucketOk,
    canWrite,
    hint:
      !envOk
        ? "Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE en Vercel."
        : !bucketOk
        ? `El bucket "${bucket}" no existe o no es accesible.`
        : !canWrite
        ? "No se pudo escribir en el bucket (revisar nombre/permisos)."
        : "OK",
  }, { headers: { "Cache-Control": "no-store" } });
}
