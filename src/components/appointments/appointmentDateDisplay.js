/**
 * Pure helpers for appointment date/time UI (no I/O).
 * `normalizeDateKey` / `appointmentDateRaw` can back future “group by date” layouts.
 */

export function appointmentDateRaw(row) {
  if (!row) return null;
  return row.appointment_date ?? row.appointmentDate ?? null;
}

export function normalizeDateKey(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    return new Date(t).toISOString().slice(0, 10);
  }
  return s;
}

export function hasMultipleDates(appointments) {
  const keys = new Set();
  for (const row of appointments) {
    keys.add(normalizeDateKey(appointmentDateRaw(row)) || "__none__");
  }
  return keys.size > 1;
}

export function formatAppointmentDateMx(raw) {
  const key = normalizeDateKey(raw);
  if (!key || key === "__none__") return "—";
  const parts = key.split("-");
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const mo = Number(parts[1]);
    const d = Number(parts[2]);
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(d)) {
      const utc = new Date(Date.UTC(y, mo - 1, d));
      return utc.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      });
    }
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
