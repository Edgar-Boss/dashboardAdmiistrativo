import { useEffect, useMemo, useState } from "react";
import DoctorCard from "../components/doctors/DoctorCard";
import DoctorsFilters from "../components/doctors/DoctorsFilters";
import { fetchSpecialists, updateSpecialist } from "../services/specialistService";

function normalize(text) {
  return String(text ?? "").trim().toLowerCase();
}

function SummaryCard({ label, value, tone = "slate" }) {
  const toneStyles =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "rose"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-50 text-slate-700";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
            {value}
          </p>
          <p className="mt-1.5 text-sm font-medium text-gray-500">{label}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneStyles}`}
          aria-hidden
        >
          <span className="text-sm font-semibold tabular-nums">{value}</span>
        </div>
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toggleError, setToggleError] = useState(null);
  const [updatingIds, setUpdatingIds] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("name-asc");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const specialists = await fetchSpecialists();
        if (!cancelled) {
          // API returns {id, name, specialty, activeFlag}. UI needs stats, so we mock those.
          const enriched = specialists.map((s) => {
            const idNum = Number(s.id);
            const flag = String(s.activeFlag ?? "").trim().toUpperCase();
            const active = flag === "Y";
            const appointmentsThisMonth = Number.isFinite(idNum)
              ? (idNum * 7) % 65
              : 0;
            return {
              id: s.id,
              name: s.name,
              specialty: s.specialty,
              status: active ? "active" : "inactive",
              email: null,
              phone: null,
              appointmentsThisMonth,
            };
          });
          setDoctors(enriched);
        }
      } catch (e) {
        if (!cancelled) {
          setDoctors([]);
          setLoadError(e instanceof Error ? e.message : "Failed to load specialists.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const specialties = useMemo(() => {
    const set = new Set(doctors.map((d) => d.specialty).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [doctors]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    const spec = specialty;
    const st = status;

    let rows = doctors.filter((d) => {
      if (q) {
        const hay = `${d.name} ${d.specialty} ${d.email ?? ""} ${d.phone ?? ""}`;
        if (!normalize(hay).includes(q)) return false;
      }
      if (spec !== "all" && d.specialty !== spec) return false;
      if (st !== "all" && normalize(d.status) !== st) return false;
      return true;
    });

    rows = rows.slice().sort((a, b) => {
      if (sort === "name-desc") return a.name.localeCompare(b.name, "es") * -1;
      if (sort === "appointments-desc")
        return (b.appointmentsThisMonth ?? 0) - (a.appointmentsThisMonth ?? 0);
      if (sort === "appointments-asc")
        return (a.appointmentsThisMonth ?? 0) - (b.appointmentsThisMonth ?? 0);
      return a.name.localeCompare(b.name, "es");
    });

    return rows;
  }, [doctors, query, specialty, status, sort]);

  const summary = useMemo(() => {
    const total = doctors.length;
    const active = doctors.filter((d) => normalize(d.status) === "active").length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [doctors]);

  function handleNewDoctor() {
    // No backend create here; just a local mock entry for UI.
    const nextId = Math.max(0, ...doctors.map((d) => Number(d.id) || 0)) + 1;
    setDoctors((prev) => [
      {
        id: nextId,
        name: `Nuevo especialista #${nextId}`,
        specialty: "Medicina General",
        status: "active",
        email: null,
        phone: null,
        appointmentsThisMonth: 0,
      },
      ...prev,
    ]);
  }

  function handleEdit(doctor) {
    // Mock-only: minimal “edit” behavior to demonstrate UI.
    const nextName = `${doctor.name} (Editado)`;
    setDoctors((prev) =>
      prev.map((d) => (d.id === doctor.id ? { ...d, name: nextName } : d))
    );
  }

  function handleToggleStatus(doctor) {
    const doctorId = Number(doctor?.id);
    if (!Number.isFinite(doctorId)) {
      setToggleError("Invalid doctor id.");
      return;
    }

    setToggleError(null);
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(doctorId);
      return next;
    });

    const prevStatus = normalize(doctor?.status) === "active" ? "active" : "inactive";
    const nextStatus = prevStatus === "active" ? "inactive" : "active";
    const activeFlag = nextStatus === "active" ? "Y" : "N";

    // Optimistic UI update with rollback on failure.
    setDoctors((prev) =>
      prev.map((d) => (d.id === doctor.id ? { ...d, status: nextStatus } : d))
    );

    (async () => {
      try {
        await updateSpecialist({
          doctorId,
          name: String(doctor?.name ?? "").trim(),
          specialty: String(doctor?.specialty ?? "").trim(),
          active: activeFlag,
        });
      } catch (e) {
        setDoctors((prev) =>
          prev.map((d) => (d.id === doctor.id ? { ...d, status: prevStatus } : d))
        );
        setToggleError(e instanceof Error ? e.message : "Failed to update specialist.");
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(doctorId);
          return next;
        });
      }
    })();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12 lg:px-10">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Especialistas
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Administra los especialistas y especialidades de la clínica
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleNewDoctor}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1"
            >
              + Nuevo especialista
            </button>
          </div>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          <SummaryCard label="Total especialistas" value={summary.total} tone="slate" />
          <SummaryCard label="Activos" value={summary.active} tone="emerald" />
          <SummaryCard label="Inactivos" value={summary.inactive} tone="rose" />
        </section>

        <div className="mb-6">
          <DoctorsFilters
            query={query}
            onQueryChange={setQuery}
            specialty={specialty}
            specialties={specialties}
            onSpecialtyChange={setSpecialty}
            status={status}
            onStatusChange={setStatus}
            sort={sort}
            onSortChange={setSort}
          />
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">
              {filtered.length} especialista{filtered.length !== 1 ? "s" : ""}
            </p>
            {loading ? (
              <p className="text-xs text-gray-500" role="status" aria-live="polite">
                Cargando especialistas...
              </p>
            ) : loadError ? (
              <p className="text-xs text-rose-700" role="status">
                {loadError}
              </p>
            ) : toggleError ? (
              <p className="text-xs text-rose-700" role="status">
                {toggleError}
              </p>
            ) : (
              <p className="text-xs text-gray-500">Fuente: API de especialistas</p>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center text-sm font-medium text-gray-600">
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-600">
                No hay especialistas que coincidan con los filtros.
              </p>
              <p className="mt-1 max-w-md text-xs text-gray-500">
                Prueba con otro término de búsqueda o ajusta los filtros.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onEdit={handleEdit}
                  onToggleStatus={handleToggleStatus}
                  isUpdating={updatingIds.has(Number(doctor.id))}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

