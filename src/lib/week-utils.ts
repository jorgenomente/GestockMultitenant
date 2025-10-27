// utilidades ISO week (lunes-domingo) y helpers de UI
export type WeekId = string; // "2025-W40"

const MS = 86400000;

export function startOfISOWeekUTC(t = Date.now()): number {
  const d = new Date(t);
  const dow = (d.getUTCDay() + 6) % 7; // 0=lunes ... 6=domingo
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime() - dow * MS;
}
export function endOfISOWeekUTC(t = Date.now()): number {
  return startOfISOWeekUTC(t) + 6 * MS;
}

// Algoritmo ISO (año-semana)
function isoWeekParts(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // jueves de la semana ISO
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const weekYear = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  const week = 1 + Math.round(
    ((d.getTime() - firstThursday.getTime()) / MS - ((firstThursday.getUTCDay() + 6) % 7) + 3) / 7
  );
  return { weekYear, week };
}

export function isoWeekIdFromMs(t = Date.now()): WeekId {
  const { weekYear, week } = isoWeekParts(new Date(t));
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

export function weekLabelFromMs(t = Date.now()) {
  const a = startOfISOWeekUTC(t);
  const b = endOfISOWeekUTC(t);
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString("es-AR", { timeZone: "UTC", day: "numeric", month: "numeric" });
  const { week } = isoWeekParts(new Date(t));
  return `Semana del ${fmt(a)}–${fmt(b)} · Semana ${week}`;
}

export function weekLabelFromId(weekId: WeekId) {
  const [y, w] = weekId.split("-W");
  // lunes de esa ISO week:
  const jan4 = Date.UTC(Number(y), 0, 4);
  const jan4Dow = (new Date(jan4).getUTCDay() + 6) % 7;
  const monday = jan4 - jan4Dow * MS + (Number(w) - 1) * 7 * MS;
  return weekLabelFromMs(monday);
}

// Lista de semanas para el selector (pasadas y futuras)
export function listWeeksAround(anchorId: WeekId, past = 16, future = 4) {
  const [y, w] = anchorId.split("-W");

  // lunes base
  const jan4 = Date.UTC(Number(y), 0, 4);
  const jan4Dow = (new Date(jan4).getUTCDay() + 6) % 7;
  let monday = jan4 - jan4Dow * MS + (Number(w) - 1) * 7 * MS;

  const out: { id: WeekId; label: string }[] = [];
  // ir al pasado
  let cur = monday - past * 7 * MS;
  for (let i = -past; i <= future; i++) {
    const id = isoWeekIdFromMs(cur);
    out.push({ id, label: weekLabelFromId(id) });
    cur += 7 * MS;
  }
  return out;
}
