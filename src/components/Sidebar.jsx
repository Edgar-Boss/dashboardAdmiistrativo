import { LogOut } from "lucide-react";
import { getStoredUser } from "../services/authService";

const ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "citas", label: "Citas" },
  { id: "doctores", label: "Especialistas" },
  { id: "pacientes", label: "Pacientes" },
  { id: "configuracion", label: "Configuración" },
];

export default function Sidebar({ active = "", onLogout }) {
  const user = getStoredUser();

  return (
    <aside
      className="flex w-[240px] shrink-0 flex-col border-r border-slate-800 bg-slate-900 min-h-screen"
      aria-label="Navegación principal"
    >
      <div className="border-b border-slate-800 px-4 py-5">
        <p className="text-sm font-semibold tracking-tight text-white">Panel</p>
        <p className="mt-0.5 text-xs text-slate-400">Administrativo</p>
        {user?.username ? (
          <p className="mt-2 truncate text-xs text-slate-500">{user.username}</p>
        ) : null}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
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
  );
}
