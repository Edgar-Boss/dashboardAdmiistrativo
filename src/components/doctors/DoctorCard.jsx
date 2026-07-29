import Button from "../ui/Button";
import DoctorStatusBadge from "./DoctorStatusBadge";

function initials(name) {
  const s = String(name ?? "").trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function formatDisplay(value) {
  const s = String(value ?? "").trim();
  return s || "—";
}

export default function DoctorCard({ doctor, onEdit }) {
  return (
    <article className="group nb-card p-5 transition hover:-translate-y-0.5 hover:shadow-brand-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-primary ring-1 ring-brand-primary/15">
            {initials(doctor?.name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-brand-text">
                {formatDisplay(doctor?.name)}
              </h3>
              <DoctorStatusBadge status={doctor?.status} />
            </div>
            <p className="mt-1 truncate text-xs text-brand-text-muted">
              {formatDisplay(doctor?.specialty)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onEdit?.(doctor)}>
          Editar
        </Button>
      </div>
    </article>
  );
}

