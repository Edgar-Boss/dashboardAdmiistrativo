import { useMemo } from "react";
import {
  formatAppointmentDuration,
  formatAppointmentTimeRange,
  resolveSlotCount,
} from "./appointmentEditHelpers";
import {
  doctorNameMatchesAppointment,
  normalizeTimeKey,
  timeToMinutes,
} from "./appointmentHelpers";

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;
const ROW_HEIGHT_PX = 64;

function normalizeState(state) {
  const key = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(key) ? key : "PENDING";
}

function statePillClass(state) {
  switch (normalizeState(state)) {
    case "CONFIRMED":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "CANCELLED":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "PENDING":
    default:
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

/** 30-minute grid rows, plus any appointment start times outside the grid. */
function buildSlotTimeKeys(appointments) {
  const set = new Set();
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h += 1) {
    set.add(`${String(h).padStart(2, "0")}:00`);
    if (h < DAY_END_HOUR) {
      set.add(`${String(h).padStart(2, "0")}:30`);
    }
  }
  for (const a of appointments) {
    const k = normalizeTimeKey(a?.appointmentTime);
    if (k && k !== "—") set.add(k);
  }
  return [...set].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

function buildDoctorColumns({ specialists, appointments }) {
  if (Array.isArray(specialists) && specialists.length > 0) {
    return specialists.map((s) => ({
      key: `sp-${s.id ?? s.name}`,
      doctorId: s.id,
      doctorName: s.name,
      specialty: s.specialty || "",
    }));
  }

  const map = new Map();
  for (const row of appointments) {
    const id = row?.doctorId ?? "—";
    if (!map.has(id)) {
      map.set(id, {
        key: `doc-${id}`,
        doctorId: id,
        doctorName: row?.doctorName ?? "—",
        specialty: row?.specialty ?? "",
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    String(a.doctorName).localeCompare(String(b.doctorName), "es")
  );
}

function buildAppointmentBlocks(appointments) {
  return appointments.map((row) => {
    const slotCount = resolveSlotCount(row);
    const startKey = normalizeTimeKey(
      row?.appointmentTime ?? row?.appointment_time
    );
    const startMin = timeToMinutes(startKey);
    return {
      row,
      doctorId: row?.doctorId ?? row?.doctor_id ?? "—",
      doctorName: row?.doctorName ?? row?.doctor_name ?? "",
      startKey,
      startMin,
      slotCount,
    };
  });
}

function blockMatchesColumn(block, column) {
  if (String(block.doctorId) === String(column.doctorId ?? "—")) {
    return true;
  }
  return doctorNameMatchesAppointment(column.doctorName, block.row);
}

function findStartBlocks(blocks, column, timeKey) {
  const key = normalizeTimeKey(timeKey);
  return blocks.filter(
    (b) => blockMatchesColumn(b, column) && b.startKey === key
  );
}

function appointmentForDisplay(row, startKey, slotCount) {
  return { ...row, appointmentTime: startKey, slotCount };
}

function AppointmentBlockCard({ block }) {
  const { row, slotCount, startKey } = block;
  const display = appointmentForDisplay(row, startKey, slotCount);
  const timeRange = formatAppointmentTimeRange(display);
  const durationLabel = formatAppointmentDuration(display);
  const state = normalizeState(row?.state);
  const patientName =
    row?.patientName ?? row?.patient_name ?? row?.name ?? "—";
  const cardHeight = Math.max(slotCount * ROW_HEIGHT_PX - 8, ROW_HEIGHT_PX - 8);

  return (
    <div
      className="absolute inset-x-1 top-1 z-10 flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-2 shadow-md ring-1 ring-gray-100/80"
      style={{ height: `${cardHeight}px` }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-900">
            {patientName}
          </p>
          <span
            className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${statePillClass(
              state
            )}`}
          >
            {state}
          </span>
        </div>
        <p className="mt-1 text-[10px] font-medium tabular-nums text-gray-700">
          {timeRange}
        </p>
        <p className="mt-0.5 text-[10px] text-gray-500">{durationLabel}</p>
        {row?.reason ? (
          <p className="mt-auto truncate text-[10px] text-gray-400">{row.reason}</p>
        ) : null}
      </div>
    </div>
  );
}

function CalendarDoctorCell({ blocks, column, timeKey }) {
  const starts = findStartBlocks(blocks, column, timeKey);

  return (
    <div className="relative min-h-16 overflow-visible border-b border-r border-gray-100 bg-white">
      {starts.map((block) => (
        <AppointmentBlockCard key={block.row?.id ?? `${block.startKey}-${block.doctorId}`} block={block} />
      ))}
    </div>
  );
}

/**
 * Calendar grid:
 * - Columns: doctors (prefer specialists list for base columns)
 * - Rows: 30-minute slots
 * - Cells: appointments span multiple rows according to slotCount
 */
export default function DailyCalendarView({
  appointments = [],
  specialists = [],
  specialistsReady = true,
  loading = false,
}) {
  const timeKeys = useMemo(() => buildSlotTimeKeys(appointments), [appointments]);
  const columns = useMemo(
    () => buildDoctorColumns({ specialists, appointments }),
    [specialists, appointments]
  );
  const blocks = useMemo(
    () => buildAppointmentBlocks(appointments),
    [appointments]
  );

  if (loading) {
    return (
      <div
        className="flex min-h-[240px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-500 shadow-sm"
        role="status"
        aria-live="polite"
      >
        Loading day appointments...
      </div>
    );
  }

  if (!specialistsReady && columns.length === 0) {
    return (
      <div
        className="flex min-h-[240px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-500 shadow-sm"
        role="status"
        aria-live="polite"
      >
        Loading specialists...
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-500 shadow-sm">
        No doctors to display.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-visible rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto overflow-y-visible">
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `5rem repeat(${columns.length}, minmax(220px, 1fr))`,
          }}
        >
          <div className="sticky left-0 top-0 z-[2] border-b border-r border-gray-100 bg-gray-50/95 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Hora
          </div>
          {columns.map((c) => (
            <div
              key={c.key}
              className="sticky top-0 z-[1] border-b border-r border-gray-100 bg-gray-50/95 px-3 py-2"
            >
              <p className="truncate text-sm font-semibold text-gray-900">
                {c.doctorName}
              </p>
              {c.specialty ? (
                <p className="truncate text-[11px] text-gray-500">
                  {c.specialty}
                </p>
              ) : null}
            </div>
          ))}

          {timeKeys.map((timeKey) => (
            <div key={`row-${timeKey}`} className="contents">
              <div className="sticky left-0 z-[1] border-b border-r border-gray-100 bg-white px-2 py-2 text-xs font-medium tabular-nums text-gray-600">
                {timeKey}
              </div>
              {columns.map((c) => (
                <CalendarDoctorCell
                  key={`${c.key}-${timeKey}`}
                  blocks={blocks}
                  column={c}
                  timeKey={timeKey}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
