import { CalendarDays } from "lucide-react";

export default function CalendarToolbar({
  selectedDate,
  onDateChange,
  onToday,
  formattedDateLabel,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onToday}
        className="inline-flex items-center gap-2 rounded-brand border border-brand-border bg-brand-surface px-4 py-2.5 text-sm font-medium text-brand-text shadow-brand transition hover:border-brand-border-strong hover:bg-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25"
      >
        Hoy
      </button>

      <label className="relative inline-flex items-center gap-2 rounded-brand border border-brand-border bg-brand-surface px-3 py-2 shadow-brand transition hover:border-brand-border-strong focus-within:ring-2 focus-within:ring-brand-primary/25">
        <CalendarDays className="h-4 w-4 text-brand-text-muted" aria-hidden />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange?.(e.target.value)}
          className="border-0 bg-transparent p-0 text-sm text-brand-text focus:outline-none focus:ring-0"
          aria-label="Fecha"
        />
      </label>

      {formattedDateLabel ? (
        <p className="hidden text-sm font-medium capitalize text-brand-text-muted sm:block">
          {formattedDateLabel}
        </p>
      ) : null}
    </div>
  );
}
