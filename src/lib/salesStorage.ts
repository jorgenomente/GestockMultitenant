const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_SALES_BUCKET
  ?? process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET
  ?? process.env.SUPABASE_SALES_BUCKET
  ?? process.env.SUPABASE_STORAGE_BUCKET
  ?? "gestock";

const DEFAULT_DIR = process.env.NEXT_PUBLIC_SUPABASE_SALES_DIR
  ?? process.env.SUPABASE_SALES_DIR
  ?? "sales";

export const SALES_STORAGE_BUCKET = DEFAULT_BUCKET;
export const SALES_STORAGE_DIR = DEFAULT_DIR;

export const SALES_ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

export const SALES_STORAGE_MAX_SIZE = 20 * 1024 * 1024; // 20 MB
