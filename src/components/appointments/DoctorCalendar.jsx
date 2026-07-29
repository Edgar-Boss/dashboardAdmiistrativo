import { useMemo } from "react";
import AppointmentRow from "./AppointmentRow";
import { buildDoctorGroups, formatAppointmentDate } from "./appointmentHelpers";

export default function DoctorCalendar({ appointments, savingIds, onStateChange }) {
  const columns = useMemo(() => buildDoctorGroups(appointments), [appointments]);

  return (
    <div className="overflow-hidden rounded-brand-md border border-brand-border bg-brand-surface shadow-brand">
      <div className="overflow-x-auto px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex min-w-max gap-4 pb-1">
          {columns.map(({ doctorName, rows }) => (
            <div
              key={doctorName}
              className="flex w-[min(100vw-2rem,280px)] shrink-0 flex-col sm:w-72"
            >
              <div className="sticky top-0 z-[1] rounded-t-brand-md border border-b-0 border-brand-border bg-brand-soft/60 px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-brand-text">{doctorName}</p>
                <p className="text-[11px] text-brand-text-muted">{rows.length} cita{rows.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex flex-1 flex-col gap-2 rounded-b-brand-md border border-brand-border bg-brand-soft/25 p-2">
                {rows.map((row) => (
                  <AppointmentRow
                    key={row.id}
                    row={row}
                    savingIds={savingIds}
                    onStateChange={onStateChange}
                    hasMultipleDates={false}
                    formatDate={formatAppointmentDate}
                    listMode="doctor"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
