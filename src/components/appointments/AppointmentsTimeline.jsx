import { useMemo } from "react";
import AppointmentRow from "./AppointmentRow";
import {
  appointmentDateKey,
  buildHourGroups,
  formatAppointmentDate,
} from "./appointmentHelpers";

export default function AppointmentsTimeline({ appointments, savingIds, onStateChange }) {
  const hasMultipleDates =
    new Set(appointments.map((a) => appointmentDateKey(a))).size > 1;

  const groups = useMemo(() => buildHourGroups(appointments), [appointments]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex gap-3 sm:gap-4">
          <div className="relative w-[60px] shrink-0 self-stretch">
            <div
              aria-hidden
              className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 bg-gray-200"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            {groups.map(({ timeKey, rows }, idx) => (
              <div
                key={timeKey}
                className={`relative space-y-2 ${idx > 0 ? "border-t border-gray-100 pt-3" : ""}`}
              >
                <div className="relative flex items-center gap-2.5 pt-0.5">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-[calc(-0.75rem-30px)] top-2.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-gray-400 shadow-sm ring-1 ring-gray-200 sm:left-[calc(-1rem-30px)]"
                  />
                  <p className="text-lg font-semibold tracking-tight text-gray-900">{timeKey}</p>
                </div>
                <div className="space-y-2">
                  {rows.map((row) => (
                    <AppointmentRow
                      key={row.id}
                      row={row}
                      savingIds={savingIds}
                      onStateChange={onStateChange}
                      hasMultipleDates={hasMultipleDates}
                      formatDate={formatAppointmentDate}
                      listMode="day"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
