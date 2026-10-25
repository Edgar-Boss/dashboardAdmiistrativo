import { useMemo, useState } from "react";
import AppointmentActionsMenu from "./AppointmentActionsMenu";
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

function getRowMeta(row) {
  const rawDate = row.appointmentDate ?? row.appointment_date ?? row.date ?? null;
  return {
    dateCell: rawDate ? formatAppointmentDate(rawDate) : "—",
    timeRange: formatAppointmentTimeRange(row),
    durationLabel: formatAppointmentDuration(row),
    reasonCell: formatDisplay(getNotes(row)),
  };
}

export default function AppointmentsTable({
  appointments,
  savingIds,
  onStateChange,
  onEditAppointment,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);

  const sorted = useMemo(
    () => appointments.slice().sort(compareByDateTime),
    [appointments]
  );

  function renderActions(row, surface) {
    const menuId = `${surface}-${row.id}`;
    return (
      <AppointmentActionsMenu
        appointment={row}
        appointmentId={row.id}
        state={row.state}
        patientName={row.name}
        disabled={savingIds.has(row.id)}
        isOpen={openMenuId === menuId}
        onOpen={() => setOpenMenuId(menuId)}
        onClose={() => setOpenMenuId(null)}
        onStateChange={onStateChange}
        onEdit={onEditAppointment}
      />
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {sorted.map((row) => {
          const { dateCell, timeRange, durationLabel, reasonCell } = getRowMeta(row);
          return (
            <article
              key={row.id}
              className="rounded-brand-md border border-brand-border bg-brand-surface p-4 shadow-brand"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-brand-text">
                    {formatDisplay(row.name)}
                  </p>
                  <p className="mt-1 text-xs text-brand-text-muted">
                    {dateCell} · {timeRange}
                  </p>
                  <p className="mt-0.5 text-xs text-brand-text-muted">{durationLabel}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge state={row.state} />
                  {renderActions(row, "mobile")}
                </div>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-xs font-medium uppercase tracking-wider text-brand-text-muted">
                    Doctor
                  </dt>
                  <dd className="min-w-0 text-brand-text">
                    {formatDisplay(row.doctorName)}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-xs font-medium uppercase tracking-wider text-brand-text-muted">
                    Motivo
                  </dt>
                  <dd className="min-w-0 text-brand-text-muted">{reasonCell}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-brand-md border border-brand-border bg-brand-surface shadow-brand md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-brand-border bg-brand-soft/60">
              <tr>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                  Fecha
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                  Horario
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                  Paciente
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                  Motivo
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                  Doctor
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const { dateCell, timeRange, durationLabel, reasonCell } =
                  getRowMeta(row);

                return (
                  <tr
                    key={row.id}
                    className="group border-b border-brand-border transition-colors last:border-b-0 hover:bg-brand-soft/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-brand-text-muted">
                      {dateCell}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-medium tabular-nums text-brand-text">
                        {timeRange}
                      </p>
                      <p className="mt-0.5 text-xs text-brand-text-muted">
                        {durationLabel}
                      </p>
                    </td>
                    <td className="max-w-[200px] px-4 py-3 font-bold text-brand-text">
                      <span className="line-clamp-2">{formatDisplay(row.name)}</span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-brand-text-muted">
                      <span
                        className="line-clamp-2"
                        title={reasonCell !== "—" ? reasonCell : undefined}
                      >
                        {reasonCell}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-4 py-3 text-brand-text-muted">
                      <span className="line-clamp-2">
                        {formatDisplay(row.doctorName)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge state={row.state} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        {renderActions(row, "desktop")}
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
