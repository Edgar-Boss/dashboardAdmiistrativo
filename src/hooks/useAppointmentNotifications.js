import { useCallback, useEffect, useState } from "react";
import {
  formatAppointmentDate,
  normalizeTimeKey,
} from "../components/appointments/appointmentHelpers";
import { fetchAppointments } from "../services/appointmentService";

const POLL_MS = 12000;

/** Session-known appointment IDs (shared so panel creates can suppress the next poll notify). */
let knownAppointmentIds = new Set();

/**
 * Mark appointment IDs as already seen so polling will not notify them.
 * @param {Iterable<number|string|null|undefined>} ids
 */
export function rememberAppointmentIds(ids) {
  if (!ids) return;
  for (const id of ids) {
    if (id != null && id !== "") {
      knownAppointmentIds.add(id);
    }
  }
}

function supportsNotificationApi() {
  return typeof window !== "undefined" && "Notification" in window;
}

function readPermission() {
  if (!supportsNotificationApi()) return "unsupported";
  return Notification.permission;
}

function formatNotificationTime(raw) {
  const key = normalizeTimeKey(raw);
  if (key === "—") return "—";
  const [hStr, mStr] = key.split(":");
  let hours = Number.parseInt(hStr, 10);
  if (!Number.isFinite(hours)) return key;
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${mStr} ${suffix}`;
}

function formatNotificationDate(raw) {
  const s = String(raw ?? "").trim();
  const cal = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (cal) {
    const local = new Date(Number(cal[1]), Number(cal[2]) - 1, Number(cal[3]));
    if (!Number.isNaN(local.getTime())) {
      return local.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
      });
    }
  }
  return formatAppointmentDate(raw) || "—";
}

function buildNotificationBody(appointment) {
  const client = appointment?.name ?? appointment?.patientName ?? "—";
  const specialist = appointment?.doctorName ?? appointment?.doctor ?? "—";
  const date = formatNotificationDate(
    appointment?.appointmentDate ?? appointment?.appointment_date ?? appointment?.date
  );
  const time = formatNotificationTime(
    appointment?.appointmentTime ?? appointment?.appointment_time
  );

  return [
    "Se ha registrado una nueva cita.",
    `Cliente: ${client}`,
    `Especialista: ${specialist}`,
    `Fecha: ${date}`,
    `Hora: ${time}`,
  ].join("\n");
}

function showNewAppointmentNotification(appointment) {
  if (!supportsNotificationApi() || Notification.permission !== "granted") {
    return;
  }
  try {
    const notification = new Notification("Nueva cita pendiente", {
      body: buildNotificationBody(appointment),
    });
    void notification;
  } catch {
    // Browser may still throw even when permission looks granted.
  }
}

/**
 * Polls appointments while authenticated + notification permission is granted.
 * First successful fetch is baseline-only (no notifications).
 *
 * @param {boolean} enabled
 */
export function useAppointmentNotifications(enabled) {
  const [permission, setPermission] = useState(readPermission);

  const requestPermission = useCallback(async () => {
    if (!supportsNotificationApi()) {
      setPermission("unsupported");
      return "unsupported";
    }

    const current = Notification.permission;
    if (current !== "default") {
      setPermission(current);
      return current;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    if (!supportsNotificationApi()) return undefined;
    if (permission !== "granted") return undefined;

    let cancelled = false;
    let baselineReady = false;
    knownAppointmentIds = new Set();

    async function poll() {
      try {
        const data = await fetchAppointments();
        if (cancelled) return;

        const list = Array.isArray(data) ? data : [];

        if (!baselineReady) {
          for (const appointment of list) {
            if (appointment?.id != null) {
              knownAppointmentIds.add(appointment.id);
            }
          }
          baselineReady = true;
          return;
        }

        for (const appointment of list) {
          const id = appointment?.id;
          if (id == null || knownAppointmentIds.has(id)) continue;
          knownAppointmentIds.add(id);
          showNewAppointmentNotification(appointment);
        }
      } catch {
        // Keep the panel unaffected on transient API errors.
      }
    }

    poll();
    const intervalId = window.setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      knownAppointmentIds = new Set();
    };
  }, [enabled, permission]);

  return {
    permission,
    requestPermission,
  };
}
