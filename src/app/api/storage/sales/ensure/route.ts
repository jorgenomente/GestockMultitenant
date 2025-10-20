import { NextResponse } from "next/server";
import {
  SALES_ALLOWED_MIME_TYPES,
  SALES_STORAGE_BUCKET,
  SALES_STORAGE_MAX_SIZE,
} from "@/lib/salesStorage";
import {
  getSupabaseAdminClient,
  hasSupabaseAdmin,
} from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND_CODES = new Set(["Bucket not found", "The resource was not found"]);

const arraysEqual = (a?: string[] | null, b?: string[] | null) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

export async function POST() {
  if (!hasSupabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Supabase admin no está configurado." },
      { status: 500 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const bucketId = SALES_STORAGE_BUCKET;
  const fileSizeLimit = SALES_STORAGE_MAX_SIZE;

  try {
    const { data: existing, error: getErr } = await supabase.storage.getBucket(bucketId);

    if (getErr && !NOT_FOUND_CODES.has(getErr.message)) {
      return NextResponse.json(
        { ok: false, error: getErr.message ?? "No se pudo verificar el bucket." },
        { status: 500 },
      );
    }

    if (!existing) {
      const { error: createErr } = await supabase.storage.createBucket(bucketId, {
        public: true,
        fileSizeLimit,
        allowedMimeTypes: SALES_ALLOWED_MIME_TYPES,
      });
      if (createErr) {
        return NextResponse.json(
          { ok: false, error: createErr.message ?? "No se pudo crear el bucket." },
          { status: 500 },
        );
      }
    } else {
      const needsUpdate =
        !existing.public || existing.file_size_limit !== fileSizeLimit ||
        !arraysEqual(existing.allowed_mime_types ?? null, SALES_ALLOWED_MIME_TYPES);
      if (needsUpdate) {
        const { error: updateErr } = await supabase.storage.updateBucket(bucketId, {
          public: true,
          fileSizeLimit,
          allowedMimeTypes: SALES_ALLOWED_MIME_TYPES,
        });
        if (updateErr) {
          return NextResponse.json(
            { ok: false, error: updateErr.message ?? "No se pudo actualizar el bucket." },
            { status: 500 },
          );
        }
      }
    }

    return NextResponse.json({ ok: true, bucket: bucketId }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error inesperado al asegurar el bucket.";
    console.error("ensure sales bucket error", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
