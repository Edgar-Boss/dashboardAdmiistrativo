import { Fragment, useMemo } from "react";
import AppointmentRow from "./AppointmentRow";

function normalizeTimeKey(raw) {
  if (raw === null || raw === undefined || raw === "") return "—";
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    const h = m[1].padStart(2, "0");
    return `${h}:${m[2]}`;
  }
  return s;
}

function timeToMinutes(key) {
  if (key === "—") return 0;
  const m = key.match(/^(\d{2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export default function AppointmentTable({ appointments, savingIds, onStateChange }) {
  const groups = useMemo(() => {
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
  }, [appointments]);

  if (appointments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-12 text-center">
        <p className="text-sm font-medium text-slate-600">No hay citas en este filtro.</p>
        <p className="mt-1 text-xs text-slate-500">Prueba con otra pestaña o revisa más tarde.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-gray-50 shadow-sm">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="whitespace-nowrap px-4 py-3">
                Hora
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-3">
                Paciente
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-3">
                Doctor
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-3">
                Motivo
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-3">
                Estado
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-3">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {groups.map(({ timeKey, rows }, idx) => (
              <Fragment key={timeKey}>
                <tr className="bg-slate-50/90">
                  <td
                    colSpan={6}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${idx > 0 ? "border-t border-slate-200" : ""}`}
                  >
                    {timeKey}
                  </td>
                </tr>
                {rows.map((row) => (
                  <AppointmentRow
                    key={row.id}
                    row={row}
                    savingIds={savingIds}
                    onStateChange={onStateChange}
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
