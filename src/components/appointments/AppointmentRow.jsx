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

export default function AppointmentRow({ row, savingIds, onStateChange }) {
  const specialty = specialtyFromRow(row);
  const motivo = motivoFromRow(row);

  return (
    <tr className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/90">
      <td className="whitespace-nowrap px-4 py-4 align-middle text-sm font-semibold text-slate-900">
        {formatDisplay(row.appointmentTime)}
      </td>
      <td className="px-4 py-4 align-middle">
        <p className="font-medium text-slate-900">{formatDisplay(row.name)}</p>
        <p className="mt-0.5 text-sm text-slate-500">{formatDisplay(row.phoneNumber)}</p>
      </td>
      <td className="px-4 py-4 align-middle">
        <p className="font-medium text-slate-900">{formatDisplay(row.doctorName)}</p>
        {specialty ? (
          <p className="mt-0.5 text-sm font-normal text-slate-500">
            {formatDisplay(specialty)}
          </p>
        ) : null}
      </td>
      <td className="max-w-[200px] px-4 py-4 align-middle text-sm text-slate-600 sm:max-w-xs">
        <span className="line-clamp-2">{formatDisplay(motivo)}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-4 align-middle">
        <StatusBadge state={row.state} />
      </td>
      <td className="px-4 py-4 align-middle">
        <ActionButtons
          state={row.state}
          appointmentId={row.id}
          disabled={savingIds.has(row.id)}
          onStateChange={onStateChange}
        />
      </td>
    </tr>
  );
}
