import { useMemo } from "react";
import ActionButtons from "./ActionButtons";
import StatusBadge from "./StatusBadge";
import { compareByDateTime, formatAppointmentDate, normalizeTimeKey } from "./appointmentHelpers";

function formatDisplay(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export default function AppointmentsTable({ appointments, savingIds, onStateChange }) {
  const sorted = useMemo(
    () => appointments.slice().sort(compareByDateTime),
    [appointments]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/95">
            <tr>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Fecha
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Hora
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Paciente
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Doctor
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Estado
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const rawDate = row.appointmentDate ?? row.appointment_date ?? row.date ?? null;
              const dateCell = rawDate ? formatAppointmentDate(rawDate) : "—";
              const timeCell = formatDisplay(normalizeTimeKey(row.appointmentTime));

              return (
                <tr
                  key={row.id}
                  className="group border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/90"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{dateCell}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-gray-900">
                    {timeCell}
                  </td>
                  <td className="max-w-[200px] px-4 py-3 font-bold text-gray-900">
                    <span className="line-clamp-2">{formatDisplay(row.name)}</span>
                  </td>
                  <td className="max-w-[200px] px-4 py-3 text-gray-700">
                    <span className="line-clamp-2">{formatDisplay(row.doctorName)}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge state={row.state} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="pointer-events-none flex justify-end opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                      <ActionButtons
                        state={row.state}
                        appointmentId={row.id}
                        disabled={savingIds.has(row.id)}
                        onStateChange={onStateChange}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
