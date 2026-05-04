const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;
const MINUTES_PER_PX = 1;
const BLOCK_HEIGHT_PX = 50;

function parseAppointmentTime(appointmentTime) {
  if (appointmentTime == null || appointmentTime === "") {
    return null;
  }
  const s = String(appointmentTime).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function minutesSinceMidnight(hour, minute) {
  return hour * 60 + minute;
}

/** Visible day length in px (1 minute = 1 px), 08:00–20:00 → 720px */
function calendarHeightPx() {
  return (DAY_END_HOUR - DAY_START_HOUR) * 60 * MINUTES_PER_PX;
}

/** Minutes from midnight → y offset from 08:00: (hour*60+minute) − 8*60 px */
function blockTopPx(appointmentTime) {
  const parsed = parseAppointmentTime(appointmentTime);
  if (!parsed) return 0;
  const start = minutesSinceMidnight(DAY_START_HOUR, 0);
  const at = minutesSinceMidnight(parsed.hour, parsed.minute);
  const raw = (at - start) * MINUTES_PER_PX;
  const maxTop = Math.max(0, calendarHeightPx() - BLOCK_HEIGHT_PX);
  return Math.min(Math.max(0, raw), maxTop);
}

function stateStyles(state) {
  const key = typeof state === "string" ? state.toUpperCase() : "";
  switch (key) {
    case "CONFIRMED":
      return "border border-emerald-200/90 bg-emerald-50 text-emerald-950 shadow-sm";
    case "CANCELLED":
      return "border border-rose-200/90 bg-rose-50 text-rose-950 shadow-sm";
    case "PENDING":
    default:
      return "border border-amber-200/90 bg-amber-50 text-amber-950 shadow-sm";
  }
}

function formatHourLabel(h) {
  return `${String(h).padStart(2, "0")}:00`;
}

/**
 * Daily schedule (day view): hour rail + absolutely positioned appointment blocks.
 *
 * @param {{ appointmentTime: string, name: string, doctorName: string, state: string }[]} appointments
 */
export default function DailyCalendarView({ appointments = [] }) {
  const heightPx = calendarHeightPx();
  const hours = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h += 1) {
    hours.push(h);
  }

  return (
    <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="w-20 shrink-0 border-r border-gray-100 bg-gray-50/80">
        <div className="relative" style={{ height: `${heightPx}px` }}>
          {hours.map((h) => {
            const top = (h - DAY_START_HOUR) * 60 * MINUTES_PER_PX;
            return (
              <div
                key={h}
                className="absolute left-0 right-0 flex justify-end pr-2 pt-0.5 text-[11px] font-medium tabular-nums text-gray-500"
                style={{ top: `${top}px` }}
              >
                {formatHourLabel(h)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative min-w-0 flex-1 bg-white">
        <div
          className="relative mx-1 sm:mx-2"
          style={{ height: `${heightPx}px` }}
          aria-label="Horario del día"
        >
          {hours.slice(0, -1).map((h) => {
            const top = (h - DAY_START_HOUR) * 60 * MINUTES_PER_PX;
            return (
              <div
                key={`grid-${h}`}
                className="pointer-events-none absolute left-0 right-0 border-t border-gray-100"
                style={{ top: `${top}px` }}
              />
            );
          })}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 border-t border-gray-200"
            aria-hidden
          />

          {appointments.map((apt, index) => {
            const top = blockTopPx(apt.appointmentTime);
            const timeLabel =
              apt.appointmentTime != null && String(apt.appointmentTime).trim() !== ""
                ? String(apt.appointmentTime).trim()
                : "—";

            return (
              <div
                key={`${timeLabel}-${apt.name}-${index}`}
                className={`absolute left-1 right-1 rounded-lg p-2 text-left transition duration-150 ease-out hover:z-10 hover:shadow-md ${stateStyles(apt.state)}`}
                style={{
                  top: `${top}px`,
                  height: `${BLOCK_HEIGHT_PX}px`,
                }}
              >
                <p className="truncate text-xs font-bold leading-tight text-gray-900">
                  {apt.name ?? "—"}
                </p>
                <p className="mt-0.5 truncate text-[10px] leading-tight text-gray-600">
                  {apt.doctorName ?? "—"}
                </p>
                <p className="mt-0.5 text-[10px] font-medium tabular-nums text-gray-500">
                  {timeLabel}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
