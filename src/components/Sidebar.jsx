import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { getStoredUser } from "../services/authService";

const ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "citas", label: "Citas" },
  { id: "doctores", label: "Especialistas" },
  { id: "pacientes", label: "Pacientes" },
  { id: "configuracion", label: "Configuración" },
];

export default function Sidebar({ active = "", onLogout, isOpen = false, onClose }) {
  const user = getStoredUser();

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-200 lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => onClose?.()}
        aria-hidden
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] max-w-[80%] shrink-0 flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-[240px] lg:max-w-none lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navegación principal"
      >
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 px-4 py-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-white">Panel</p>
            <p className="mt-0.5 text-xs text-slate-400">Administrativo</p>
            {user?.username ? (
              <p className="mt-2 truncate text-xs text-slate-500">{user.username}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 lg:hidden"
            aria-label="Cerrar menú"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {ITEMS.map((item) => {
            const isActive = active === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => onClose?.()}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
