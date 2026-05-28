import { resolveSlotCount } from "../appointmentEditHelpers";
import { doctorNameMatchesAppointment, normalizeTimeKey, timeToMinutes } from "../appointmentHelpers";
import {
  computeCardBlockHeight,
  getCardVariant,
} from "./calendarCardLayout";
import {
  CALENDAR_CONFIG,
  getDayEndMinutes,
  getDayStartMinutes,
  getGridHeightPx,
} from "./calendarConfig";

export function buildVisualTimeSlots(config = CALENDAR_CONFIG) {
  const slots = [];
  const interval = config.gridLineIntervalMinutes;
  for (let m = getDayStartMinutes(config); m < getDayEndMinutes(config); m += interval) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push({
      minutes: m,
      label: min === 0 ? `${String(h).padStart(2, "0")}:00` : null,
      isHour: min === 0,
      topPx: ((m - getDayStartMinutes(config)) / config.slotMinutes) * config.rowHeightPx,
    });
  }
  return slots;
}

export function buildDoctorColumns({ specialists, appointments }) {
  if (Array.isArray(specialists) && specialists.length > 0) {
    return specialists.map((s, index) => ({
      key: `sp-${s.id ?? s.name}`,
      doctorId: s.id,
      doctorName: s.name,
      specialty: s.specialty || "",
      themeIndex: index,
    }));
  }

  const map = new Map();
  let index = 0;
  for (const row of appointments) {
    const id = row?.doctorId ?? "—";
    if (!map.has(id)) {
      map.set(id, {
        key: `doc-${id}`,
        doctorId: id,
        doctorName: row?.doctorName ?? "—",
        specialty: row?.specialty ?? "",
        themeIndex: index,
      });
      index += 1;
    }
  }
  return [...map.values()].sort((a, b) =>
    String(a.doctorName).localeCompare(String(b.doctorName), "es")
  );
}

export function buildAppointmentBlocks(appointments, config = CALENDAR_CONFIG) {
  const dayStart = getDayStartMinutes(config);
  const dayEnd = getDayEndMinutes(config);

  return appointments
    .map((row) => {
      const slotCount = resolveSlotCount(row);
      const startKey = normalizeTimeKey(
        row?.appointmentTime ?? row?.appointment_time
      );
      const startMin = timeToMinutes(startKey);
      if (startKey === "—" || startMin < dayStart || startMin >= dayEnd) {
        return null;
      }

      const durationMinutes = slotCount * config.slotMinutes;
      const variant = getCardVariant(durationMinutes, config.slotMinutes);

      const topPx =
        ((startMin - dayStart) / config.slotMinutes) * config.rowHeightPx;
      const heightPx = computeCardBlockHeight(slotCount, variant, config);

      return {
        row,
        doctorId: row?.doctorId ?? row?.doctor_id ?? "—",
        doctorName: row?.doctorName ?? row?.doctor_name ?? "",
        startKey,
        startMin,
        slotCount,
        durationMinutes,
        variant,
        topPx,
        heightPx,
        minHeightPx: heightPx,
      };
    })
    .filter(Boolean);
}

export function blockMatchesColumn(block, column) {
  if (String(block.doctorId) === String(column.doctorId ?? "—")) {
    return true;
  }
  return doctorNameMatchesAppointment(column.doctorName, block.row);
}

export function groupBlocksByColumn(blocks, columns) {
  const map = new Map();
  for (const col of columns) {
    map.set(
      col.key,
      blocks.filter((b) => blockMatchesColumn(b, col))
    );
  }
  return map;
}

export function formatCurrentTimeLabel(now = new Date()) {
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Maps browser time to a Y offset inside the day grid.
 * Uses minutes-from-start × pixels-per-minute (derived from config).
 */
export function getCurrentTimePosition(now = new Date(), config = CALENDAR_CONFIG) {
  const dayStart = getDayStartMinutes(config);
  const dayEnd = getDayEndMinutes(config);
  const totalMinutes = dayEnd - dayStart;

  if (totalMinutes <= 0) return null;

  const currentMinutes =
    now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  if (currentMinutes < dayStart || currentMinutes > dayEnd) return null;

  const minutesFromStart = currentMinutes - dayStart;
  const gridHeightPx = getGridHeightPx(config);
  const pixelsPerMinute = gridHeightPx / totalMinutes;
  const topPx = minutesFromStart * pixelsPerMinute;

  return {
    topPx,
    minutesFromStart,
    pixelsPerMinute,
    label: formatCurrentTimeLabel(now),
  };
}

/** @deprecated Prefer getCurrentTimePosition */
export function getCurrentTimeTopPx(now = new Date(), config = CALENDAR_CONFIG) {
  return getCurrentTimePosition(now, config)?.topPx ?? null;
}

/** True when the viewed calendar day is today (ISO string or Date). */
export function isTodayDate(dateValue) {
  if (!dateValue) return false;

  const today = new Date();

  if (dateValue instanceof Date) {
    return (
      !Number.isNaN(dateValue.getTime()) &&
      dateValue.toDateString() === today.toDateString()
    );
  }

  if (typeof dateValue === "string") {
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
    if (isoMatch) {
      const viewed = new Date(
        Number(isoMatch[1]),
        Number(isoMatch[2]) - 1,
        Number(isoMatch[3]),
      );
      return viewed.toDateString() === today.toDateString();
    }
    const parsed = new Date(dateValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toDateString() === today.toDateString();
    }
  }

  return false;
}

export { getGridHeightPx };
