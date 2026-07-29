import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import {
  DEFAULT_MAX_SLOT_COUNT,
  DEFAULT_SLOT_MINUTES,
  buildDurationOptions,
  getDurationSummary,
} from "./appointmentEditHelpers";

const selectClass =
  "w-full appearance-none rounded-brand border border-brand-border bg-brand-surface py-2.5 pl-3.5 pr-10 text-sm font-medium text-brand-text shadow-brand transition duration-150 ease-out hover:border-brand-border-strong hover:bg-brand-soft/40 focus:border-brand-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 disabled:cursor-not-allowed disabled:bg-brand-soft disabled:opacity-60";

export default function AppointmentDurationSelect({
  slotCount,
  onChange,
  slotMinutes = DEFAULT_SLOT_MINUTES,
  appointmentTime,
  disabled = false,
  maxSlotCount = DEFAULT_MAX_SLOT_COUNT,
}) {
  const durationOptions = useMemo(() => {
    const optionCount = Math.max(maxSlotCount, slotCount);
    return buildDurationOptions(optionCount, slotMinutes);
  }, [maxSlotCount, slotMinutes, slotCount]);

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
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted transition-colors duration-150"
          strokeWidth={2}
          aria-hidden
        />
      </div>

      {summary.start !== "—" ? (
        <div
          key={`${summary.start}-${summary.end}-${summary.totalLabel}`}
          className="mt-3 space-y-1.5 border-t border-brand-border pt-3 transition-opacity duration-200 ease-out"
        >
          <p className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-brand-text-muted">Hora inicio</span>
            <span className="font-medium tabular-nums text-brand-text">
              {summary.start}
            </span>
          </p>
          <p className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-brand-text-muted">Hora fin estimada</span>
            <span className="font-medium tabular-nums text-brand-text">
              {summary.end}
            </span>
          </p>
          <p className="flex items-baseline justify-between gap-3 text-[11px]">
            <span className="text-brand-text-muted">Duración total</span>
            <span className="font-medium text-brand-text-muted">{summary.totalLabel}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
