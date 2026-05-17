import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import {
  DEFAULT_MAX_SLOT_COUNT,
  DEFAULT_SLOT_MINUTES,
  buildDurationOptions,
  getDurationSummary,
} from "./appointmentEditHelpers";

const selectClass =
  "w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-10 text-sm font-medium text-gray-900 shadow-sm transition duration-150 ease-out hover:border-gray-300 hover:bg-gray-50/50 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-white dark:text-gray-900";

export default function AppointmentDurationSelect({
  slotCount,
  onChange,
  slotMinutes = DEFAULT_SLOT_MINUTES,
  appointmentTime,
  disabled = false,
  maxSlotCount = DEFAULT_MAX_SLOT_COUNT,
}) {
  const durationOptions = useMemo(
    () => buildDurationOptions(maxSlotCount, slotMinutes),
    [maxSlotCount, slotMinutes],
  );

  const summary = useMemo(
    () => getDurationSummary(appointmentTime, slotCount, slotMinutes),
    [appointmentTime, slotCount, slotMinutes],
  );

  const safeSlotCount = durationOptions.some((o) => o.slotCount === slotCount)
    ? slotCount
    : durationOptions[0]?.slotCount ?? 1;

  return (
    <div className="space-y-0">
      <div className="relative">
        <select
          id="appointment-duration"
          disabled={disabled}
          value={safeSlotCount}
          onChange={(event) => onChange?.(Number(event.target.value))}
          className={`${selectClass} cursor-pointer`}
          aria-label="Duración de la cita"
        >
          {durationOptions.map((option) => (
            <option key={option.slotCount} value={option.slotCount}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors duration-150"
          strokeWidth={2}
          aria-hidden
        />
      </div>

      {summary.start !== "—" ? (
        <div
          key={`${summary.start}-${summary.end}-${summary.totalLabel}`}
          className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 transition-opacity duration-200 ease-out"
        >
          <p className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-gray-400">Hora inicio</span>
            <span className="font-medium tabular-nums text-gray-600">
              {summary.start}
            </span>
          </p>
          <p className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-gray-400">Hora fin estimada</span>
            <span className="font-medium tabular-nums text-gray-600">
              {summary.end}
            </span>
          </p>
          <p className="flex items-baseline justify-between gap-3 text-[11px]">
            <span className="text-gray-400">Duración total</span>
            <span className="font-medium text-gray-500">{summary.totalLabel}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
