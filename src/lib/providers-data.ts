// lib/providers.ts
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

/** Ajusta el nombre si tu tabla se llama distinto */
const TABLE_NAME = "providers";

export type Frequency = "SEMANAL" | "QUINCENAL" | "MENSUAL" | "PENDIENTE";
export type PayMethod = "EFECTIVO" | "TRANSFER";

export type ProviderRow = {
  id: string;
  name: string;
  amount: number;                 // number en ARS
  frequency: Frequency;
  payment_method: PayMethod;
  weekday?: string | null;        // "Lunes", etc.
  responsable?: string | null;    // "Paola"
  status?: string | null;         // "Pendiente", "Realizado"
  updated_at?: string | null;
};

export function formatCurrency(n: number) {
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

export function groupBy<T, K extends string | number>(
  items: T[],
  getKey: (x: T) => K
): Record<K, T[]> {
  return items.reduce((acc, it) => {
    const k = getKey(it);
    (acc[k] ||= []).push(it);
    return acc;
  }, {} as Record<K, T[]>);
}

/** Datos de ejemplo (solo dev) por si la tabla está vacía o falla el fetch */
const MOCK: ProviderRow[] = [
  { id: "1", name: "Ankas", amount: 6500000, frequency: "SEMANAL",  payment_method: "TRANSFER", weekday: "Lunes",     responsable: "Paola", status: "Pendiente" },
  { id: "2", name: "Crudda", amount: 1250000, frequency: "QUINCENAL",payment_method: "EFECTIVO", weekday: "Martes",    responsable: "Jorge", status: "Pendiente" },
  { id: "3", name: "Bio Andina", amount: 3200000, frequency: "MENSUAL", payment_method: "TRANSFER", weekday: "Miércoles", responsable: "Paola", status: "Pendiente" },
];

export async function fetchProviders(): Promise<ProviderRow[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("id,name,amount,frequency,payment_method,weekday,responsable,status,updated_at")
      .order("name", { ascending: true });

    if (error) {
      console.warn(`[presupuesto] No se pudo leer ${TABLE_NAME}:`, {
        message: error.message, code: (error as any).code, details: (error as any).details
      });
      return []; // devolvemos vacío para que la UI no truene
    }

    if (!data || data.length === 0) {
      console.warn(`[presupuesto] Tabla ${TABLE_NAME} sin registros. Usando MOCK (solo dev).`);
      return MOCK;
    }
    return data as ProviderRow[];
  } catch (e: any) {
    console.warn(`[presupuesto] Excepción leyendo ${TABLE_NAME}:`, {
      name: e?.name, message: e?.message
    });
    return []; // fallback silencioso
  }
}

export const FREQ_COLORS: Record<Frequency, string> = {
  SEMANAL: "bg-emerald-500",
  QUINCENAL: "bg-amber-500",
  MENSUAL: "bg-rose-500",
  PENDIENTE: "bg-slate-300",
};

export const FREQ_BADGE: Record<Frequency, string> = {
  SEMANAL: "bg-emerald-100 text-emerald-900",
  QUINCENAL: "bg-amber-100 text-amber-900",
  MENSUAL: "bg-rose-100 text-rose-900",
  PENDIENTE: "bg-slate-100 text-slate-900",
};

export const SECTION_LABEL: Record<Frequency, string> = {
  SEMANAL: "Semanales",
  QUINCENAL: "Quincenales",
  MENSUAL: "Mensuales",
  PENDIENTE: "Pendientes",
};

export const ORDER: Frequency[] = ["SEMANAL", "QUINCENAL", "MENSUAL", "PENDIENTE"];
