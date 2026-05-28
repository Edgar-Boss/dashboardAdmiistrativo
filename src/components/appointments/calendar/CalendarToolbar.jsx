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
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        Hoy
      </button>

      <label className="relative inline-flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-3 py-2 shadow-sm transition hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-500/20">
        <CalendarDays className="h-4 w-4 text-gray-400" aria-hidden />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange?.(e.target.value)}
          className="border-0 bg-transparent p-0 text-sm text-gray-800 focus:outline-none focus:ring-0"
          aria-label="Fecha"
        />
      </label>

      {formattedDateLabel ? (
        <p className="hidden text-sm font-medium capitalize text-gray-500 sm:block">
          {formattedDateLabel}
        </p>
      ) : null}
    </div>
  );
}
