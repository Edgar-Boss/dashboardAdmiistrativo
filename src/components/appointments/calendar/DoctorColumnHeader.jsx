import { Sparkles } from "lucide-react";
import { getDoctorTheme } from "./calendarTheme";

export default function DoctorColumnHeader({
  doctorName,
  specialty,
  themeIndex = 0,
  shifts = [],
  statusLabel = null,
}) {
  const theme = getDoctorTheme(themeIndex);

  return (
    <div
      className={`sticky top-0 z-30 border-b border-brand-border/60 px-4 py-3 ${theme.header}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ${theme.avatar}`}
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight text-brand-text">
            {doctorName}
          </p>
          {specialty ? (
            <p className="mt-0.5 truncate text-xs font-normal text-brand-text-muted/90">
              {specialty}
            </p>
          ) : null}
          {statusLabel ? (
            <p className="mt-1 text-[11px] font-medium leading-4 text-brand-text" data-testid="column-status">
              {statusLabel}
            </p>
          ) : null}
          {shifts.length > 0 ? (
            <ul className="mt-1 space-y-0.5" data-testid="calendar-shifts">
              {shifts.map((shift) => (
                <li
                  key={shift}
                  className="text-[11px] font-medium leading-4 text-brand-text"
                >
                  {shift}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
