import { useEffect } from "react";

function getTitle(mode) {
  return mode === "edit" ? "Editar especialista" : "Nuevo especialista";
}

export default function DoctorDrawer({ open, onClose, mode, doctor, children }) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-gray-900/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => onClose?.()}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={getTitle(mode)}
        className={`absolute right-0 top-0 h-full w-full max-w-[420px] border-l border-gray-100 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-gray-900">
              {getTitle(mode)}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {mode === "edit"
                ? `ID: ${doctor?.id ?? "—"}`
                : "Completa los datos del especialista"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1"
            aria-label="Cerrar"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="h-[calc(100%-72px)] overflow-y-auto px-6 py-5">
          {children}
        </div>
      </aside>
    </div>
  );
}

