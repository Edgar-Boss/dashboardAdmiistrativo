import { useMemo, useState } from "react";
import AppointmentActionsMenu from "./AppointmentActionsMenu";
import AppointmentEditDrawer from "./AppointmentEditDrawer";
import StatusBadge from "./StatusBadge";
import {
  formatAppointmentDuration,
  formatAppointmentTimeRange,
  getNotes,
} from "./appointmentEditHelpers";
import { compareByDateTime, formatAppointmentDate } from "./appointmentHelpers";

function formatDisplay(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export default function AppointmentsTable({
  appointments,
  savingIds,
  onStateChange,
  onAppointmentUpdate,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);

  const sorted = useMemo(
    () => appointments.slice().sort(compareByDateTime),
    [appointments]
  );

  function handleSaveEdit(updated) {
    onAppointmentUpdate?.(updated);
    setEditingAppointment(null);
  }

  return (
    <>
      <AppointmentEditDrawer
        appointment={editingAppointment}
        isOpen={editingAppointment !== null}
        onClose={() => setEditingAppointment(null)}
        onSave={handleSaveEdit}
      />

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/95">
            <tr>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Fecha
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Horario
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Paciente
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Razón
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
              const timeRange = formatAppointmentTimeRange(row);
              const durationLabel = formatAppointmentDuration(row);
              const reasonCell = formatDisplay(getNotes(row));

              return (
                <tr
                  key={row.id}
                  className="group border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/90"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{dateCell}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <p className="font-medium tabular-nums text-gray-900">{timeRange}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{durationLabel}</p>
                  </td>
                  <td className="max-w-[200px] px-4 py-3 font-bold text-gray-900">
                    <span className="line-clamp-2">{formatDisplay(row.name)}</span>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-gray-600">
                    <span className="line-clamp-2" title={reasonCell !== "—" ? reasonCell : undefined}>
                      {reasonCell}
                    </span>
                  </td>
                  <td className="max-w-[200px] px-4 py-3 text-gray-700">
                    <span className="line-clamp-2">{formatDisplay(row.doctorName)}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge state={row.state} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <AppointmentActionsMenu
                        appointmentId={row.id}
                        state={row.state}
                        patientName={row.name}
                        disabled={savingIds.has(row.id)}
                        isOpen={openMenuId === row.id}
                        onOpen={() => setOpenMenuId(row.id)}
                        onClose={() => setOpenMenuId(null)}
                        onStateChange={onStateChange}
                        onEdit={() => {
                          setOpenMenuId(null);
                          setEditingAppointment(row);
                        }}
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
    </>
  );
}
