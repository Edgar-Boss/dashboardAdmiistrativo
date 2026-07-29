import {
  formatAppointmentDuration,
  formatAppointmentTimeRange,
} from "./appointmentEditHelpers";
import ActionButtons from "./ActionButtons";
import StatusBadge from "./StatusBadge";

function formatDisplay(value, fallback = "—") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function motivoFromRow(row) {
  return (
    row?.reason ??
    row?.motivo ??
    row?.notes ??
    row?.description ??
    null
  );
}

function specialtyFromRow(row) {
  return row?.doctorSpecialty ?? row?.specialty ?? row?.doctorSpeciality ?? null;
}

export default function AppointmentRow({
  row,
  savingIds,
  onStateChange,
  hasMultipleDates = false,
  formatDate,
  listMode = "day",
}) {
  const specialty = specialtyFromRow(row);
  const motivo = motivoFromRow(row);
  const appointmentDateValue =
    row.appointmentDate ?? row.appointment_date ?? row.date ?? null;
  const timeRange = formatAppointmentTimeRange(row);
  const durationLabel = formatAppointmentDuration(row);

  if (listMode === "all" || listMode === "doctor") {
    const dateLabel = appointmentDateValue
      ? formatDate(appointmentDateValue)
      : "Sin fecha";

    return (
      <article className="group relative overflow-hidden rounded-brand-md border border-brand-border bg-brand-surface p-3 shadow-brand transition duration-200 ease-out hover:border-brand-border-strong hover:bg-brand-soft/50 hover:shadow-brand-md">
        <p className="text-xs font-medium tabular-nums text-brand-text-muted">
          {dateLabel} · {timeRange}
        </p>
        <p className="mt-0.5 text-[11px] text-brand-text-muted">{durationLabel}</p>

        <div className="mt-2 flex min-w-0 items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-bold text-brand-text">
            {formatDisplay(row.name)}
          </p>
          <span className="shrink-0">
            <StatusBadge state={row.state} />
          </span>
        </div>

        {listMode === "all" ? (
          <p className="mt-1.5 min-w-0 truncate text-sm text-brand-text-muted">
            {formatDisplay(row.doctorName)}
          </p>
        ) : null}

        <div className="pointer-events-none mt-2 flex justify-end opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
          <ActionButtons
            state={row.state}
            appointmentId={row.id}
            patientName={row.name}
            disabled={savingIds.has(row.id)}
            onStateChange={onStateChange}
          />
        </div>
      </article>
    );
  }

  return (
    <article className="group relative overflow-hidden rounded-brand-md border border-brand-border bg-brand-surface p-3 shadow-brand transition duration-200 ease-out hover:border-brand-border-strong hover:bg-brand-soft/50 hover:shadow-brand-md">
      {hasMultipleDates ? (
        <p className="mb-1.5 text-[11px] leading-tight text-brand-text-muted">
          {appointmentDateValue ? formatDate(appointmentDateValue) : "Sin fecha"}
        </p>
      ) : null}

      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-bold text-brand-text">
          {formatDisplay(row.name)}
        </p>
        <span className="shrink-0">
          <StatusBadge state={row.state} />
        </span>
      </div>

      <p className="mt-1 text-xs font-medium tabular-nums text-brand-text-muted">
        {timeRange}
        <span className="mx-1 font-normal text-brand-text-muted">·</span>
        {durationLabel}
      </p>
      <p className="mt-1 text-xs text-brand-text-muted">{formatDisplay(row.phoneNumber)}</p>
      <p className="mt-0.5 text-[11px] text-brand-text-muted">ID: {row.id}</p>

      <p className="mt-1.5 min-w-0 text-sm text-brand-text-muted">
        <span>{formatDisplay(row.doctorName)}</span>
        {specialty ? (
          <span className="text-xs text-brand-text-muted"> · {formatDisplay(specialty)}</span>
        ) : null}
      </p>

      <p className="mt-1 min-w-0 truncate text-sm text-brand-text-muted">{formatDisplay(motivo)}</p>

      <div className="pointer-events-none mt-2 flex justify-end opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <ActionButtons
          state={row.state}
          appointmentId={row.id}
          patientName={row.name}
          disabled={savingIds.has(row.id)}
          onStateChange={onStateChange}
        />
      </div>
    </article>
  );
}
