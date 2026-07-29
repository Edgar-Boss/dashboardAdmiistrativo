import {
  DOCTOR_STATUS_STYLES,
  normalizeDoctorStatus,
} from "../ui/statusStyles";

export default function DoctorStatusBadge({ status }) {
  const key = normalizeDoctorStatus(status);
  const label = key === "active" ? "Activa" : "Inactiva";
  const styles = DOCTOR_STATUS_STYLES[key];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
  );
}
