import { useMemo } from "react";
import { normalizeTimeKey, timeToMinutes } from "./appointmentHelpers";

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;

function normalizeState(state) {
  const key = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(key) ? key : "PENDING";
}

function statePillClass(state) {
  switch (normalizeState(state)) {
    case "CONFIRMED":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "CANCELLED":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "PENDING":
    default:
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

function buildTimeKeys(appointments) {
  const set = new Set();
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h += 1) {
    set.add(`${String(h).padStart(2, "0")}:00`);
  }
  for (const a of appointments) {
    const k = normalizeTimeKey(a?.appointmentTime);
    if (k && k !== "—") set.add(k);
  }
  return [...set].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

function buildDoctorColumns({ specialists, appointments }) {
  if (Array.isArray(specialists) && specialists.length > 0) {
    return specialists.map((s) => ({
      key: `sp-${s.id ?? s.name}`,
      doctorId: s.id,
      doctorName: s.name,
      specialty: s.specialty || "",
    }));
  }

  const map = new Map();
  for (const row of appointments) {
    const id = row?.doctorId ?? "—";
    if (!map.has(id)) {
      map.set(id, {
        key: `doc-${id}`,
        doctorId: id,
        doctorName: row?.doctorName ?? "—",
        specialty: row?.specialty ?? "",
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    String(a.doctorName).localeCompare(String(b.doctorName), "es")
  );
}

function buildCellMap(appointments) {
  const map = new Map();
  for (const row of appointments) {
    const doctorId = row?.doctorId ?? "—";
    const timeKey = normalizeTimeKey(row?.appointmentTime);
    const k = `${doctorId}||${timeKey}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}

function AppointmentCell({ items }) {
  if (!items || items.length === 0) {
    return <div className="h-full w-full" />;
  }

  return (
    <div className="flex flex-col gap-1 p-1">
      {items.map((apt, idx) => {
        const state = normalizeState(apt?.state);
        const timeLabel = normalizeTimeKey(apt?.appointmentTime);
        const key = apt?.id ?? `${timeLabel}-${apt?.patientName}-${idx}`;
        return (
          <div
            key={key}
            className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-900">
                {apt?.patientName ?? "—"}
              </p>
              <span
                className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${statePillClass(
                  state
                )}`}
              >
                {state}
              </span>
            </div>
            <p className="mt-1 text-[10px] tabular-nums text-gray-500">
              {timeLabel}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Calendar grid:
 * - Columns: doctors (prefer specialists list for base columns)
 * - Rows: time keys (hours + any appointment time keys)
 * - Cells: appointments matched by doctor_id + appointment_time
 *
 * @param {{
 *  appointments: Array<{ id?: any, appointmentTime?: any, patientName?: any, doctorId?: any, doctorName?: any, specialty?: any, state?: any }>,
 *  specialists: Array<{ id?: any, name: string, specialty: string }>,
 *  specialistsReady: boolean,
 *  loading: boolean
 * }} props
 */
export default function DailyCalendarView({
  appointments = [],
  specialists = [],
  specialistsReady = true,
  loading = false,
}) {
  const timeKeys = useMemo(() => buildTimeKeys(appointments), [appointments]);
  const columns = useMemo(
    () => buildDoctorColumns({ specialists, appointments }),
    [specialists, appointments]
  );
  const cellMap = useMemo(() => buildCellMap(appointments), [appointments]);

  if (loading) {
    return (
      <div
        className="flex min-h-[240px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-500 shadow-sm"
        role="status"
        aria-live="polite"
      >
        Loading day appointments...
      </div>
    );
  }

  if (!specialistsReady && columns.length === 0) {
    return (
      <div
        className="flex min-h-[240px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-500 shadow-sm"
        role="status"
        aria-live="polite"
      >
        Loading specialists...
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-500 shadow-sm">
        No doctors to display.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `5rem repeat(${columns.length}, minmax(220px, 1fr))`,
          }}
        >
          <div className="sticky left-0 top-0 z-[2] border-b border-r border-gray-100 bg-gray-50/95 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Hora
          </div>
          {columns.map((c) => (
            <div
              key={c.key}
              className="sticky top-0 z-[1] border-b border-r border-gray-100 bg-gray-50/95 px-3 py-2"
            >
              <p className="truncate text-sm font-semibold text-gray-900">
                {c.doctorName}
              </p>
              {c.specialty ? (
                <p className="truncate text-[11px] text-gray-500">
                  {c.specialty}
                </p>
              ) : null}
            </div>
          ))}

          {timeKeys.map((timeKey) => (
            <div key={`row-${timeKey}`} className="contents">
              <div className="sticky left-0 z-[1] border-b border-r border-gray-100 bg-white px-2 py-2 text-xs font-medium tabular-nums text-gray-600">
                {timeKey}
              </div>
              {columns.map((c) => {
                const k = `${c.doctorId ?? "—"}||${timeKey}`;
                const items = cellMap.get(k) ?? [];
                return (
                  <div
                    key={`${c.key}-${timeKey}`}
                    className="min-h-16 border-b border-r border-gray-100 bg-white"
                  >
                    <AppointmentCell items={items} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
