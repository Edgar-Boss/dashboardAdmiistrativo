function normalizeStatus(status) {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "active" || s === "activo") return "active";
  if (s === "inactive" || s === "inactivo") return "inactive";
  return "active";
}

export default function DoctorStatusBadge({ status }) {
  const key = normalizeStatus(status);
  const label = key === "active" ? "Activo" : "Inactivo";
  const styles =
    key === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
  );
}

