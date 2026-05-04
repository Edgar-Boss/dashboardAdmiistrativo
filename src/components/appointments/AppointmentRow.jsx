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
  const timeText = formatDisplay(row.appointmentTime);

  if (listMode === "all" || listMode === "doctor") {
    const dateLabel = appointmentDateValue
      ? formatDate(appointmentDateValue)
      : "Sin fecha";

    return (
      <article className="group relative overflow-hidden rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition duration-200 ease-out hover:border-gray-200 hover:bg-gray-50/90 hover:shadow">
        <p className="text-xs font-medium tabular-nums text-gray-500">
          {dateLabel} · {timeText}
        </p>

        <div className="mt-2 flex min-w-0 items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-bold text-gray-900">
            {formatDisplay(row.name)}
          </p>
          <span className="shrink-0">
            <StatusBadge state={row.state} />
          </span>
        </div>

        {listMode === "all" ? (
          <p className="mt-1.5 min-w-0 truncate text-sm text-gray-700">
            {formatDisplay(row.doctorName)}
          </p>
        ) : null}

        <div className="pointer-events-none mt-2 flex justify-end opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
          <ActionButtons
            state={row.state}
            appointmentId={row.id}
            disabled={savingIds.has(row.id)}
            onStateChange={onStateChange}
          />
        </div>
      </article>
    );
  }

  return (
    <article className="group relative overflow-hidden rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition duration-200 ease-out hover:border-gray-200 hover:bg-gray-50/90 hover:shadow">
      {hasMultipleDates ? (
        <p className="mb-1.5 text-[11px] leading-tight text-gray-400">
          {appointmentDateValue ? formatDate(appointmentDateValue) : "Sin fecha"}
        </p>
      ) : null}

      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-bold text-gray-900">
          {formatDisplay(row.name)}
        </p>
        <span className="shrink-0">
          <StatusBadge state={row.state} />
        </span>
      </div>

      <p className="mt-1 text-xs text-gray-500">{formatDisplay(row.phoneNumber)}</p>
      <p className="mt-0.5 text-[11px] text-gray-400">ID: {row.id}</p>

      <p className="mt-1.5 min-w-0 text-sm text-gray-700">
        <span>{formatDisplay(row.doctorName)}</span>
        {specialty ? (
          <span className="text-xs text-gray-400"> · {formatDisplay(specialty)}</span>
        ) : null}
      </p>

      <p className="mt-1 min-w-0 truncate text-sm text-gray-600">{formatDisplay(motivo)}</p>

      <div className="pointer-events-none mt-2 flex justify-end opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <ActionButtons
          state={row.state}
          appointmentId={row.id}
          disabled={savingIds.has(row.id)}
          onStateChange={onStateChange}
        />
      </div>
    </article>
  );
}
