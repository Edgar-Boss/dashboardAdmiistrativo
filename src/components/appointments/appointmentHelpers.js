export function normalizeTimeKey(raw) {
  if (raw === null || raw === undefined || raw === "") return "—";
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    const h = m[1].padStart(2, "0");
    return `${h}:${m[2]}`;
  }
  return s;
}

export function timeToMinutes(key) {
  if (key === "—") return 0;
  const m = key.match(/^(\d{2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function appointmentDateKey(row) {
  const raw = row?.appointmentDate ?? row?.appointment_date ?? row?.date ?? "";
  const m = String(raw).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : String(raw);
}

export function doctorKey(row) {
  const v = row?.doctorName ?? row?.doctor ?? "";
  const s = String(v).trim();
  return s || "—";
}

/** Sort: appointmentDate ASC, appointmentTime ASC, id */
export function compareByDateTime(a, b) {
  const da = appointmentDateKey(a);
  const db = appointmentDateKey(b);
  if (da !== db) return da.localeCompare(db);
  const ta = timeToMinutes(normalizeTimeKey(a.appointmentTime));
  const tb = timeToMinutes(normalizeTimeKey(b.appointmentTime));
  if (ta !== tb) return ta - tb;
  return (a.id ?? 0) - (b.id ?? 0);
}

export function formatAppointmentDate(date) {
  if (date == null || date === "") return "";

  const s = String(date).trim();
  const cal = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (cal) {
    const y = Number(cal[1]);
    const mo = Number(cal[2]);
    const d = Number(cal[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return "";
    const local = new Date(y, mo - 1, d);
    if (Number.isNaN(local.getTime())) return "";
    return local.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    });
  }

  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

export function buildHourGroups(appointments) {
  const map = new Map();
  for (const row of appointments) {
    const key = normalizeTimeKey(row.appointmentTime);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  const keys = [...map.keys()].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  return keys.map((timeKey) => {
    const rows = map.get(timeKey).slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    return { timeKey, rows };
  });
}

export function buildDoctorGroups(appointments) {
  const map = new Map();
  for (const row of appointments) {
    const k = doctorKey(row);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  const doctors = [...map.keys()].sort((a, b) => a.localeCompare(b, "es"));
  return doctors.map((name) => ({
    doctorName: name,
    rows: map.get(name).slice().sort(compareByDateTime),
  }));
}
