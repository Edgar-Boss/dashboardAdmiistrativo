import { Bell, CalendarDays, LogOut, Users } from "lucide-react";
import { useEffect } from "react";
import { getStoredUser } from "../services/authService";

const ITEMS = [
  { id: "citas", label: "Citas", Icon: CalendarDays },
  { id: "doctores", label: "Doctores", Icon: Users },
];

export default function Sidebar({
  active = "",
  onLogout,
  isOpen = false,
  onClose,
  notificationPermission,
  onEnableNotifications,
}) {
  const user = getStoredUser();
  const showEnableNotifications = notificationPermission === "default";

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
        className={`nb-overlay fixed inset-0 z-40 transition-opacity duration-200 lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => onClose?.()}
        aria-hidden
      />

      <aside
        className={`nb-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] max-w-[85%] shrink-0 flex-col border-r border-white/10 transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-[248px] lg:max-w-none lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navegación principal"
      >
        <div className="flex items-start justify-between gap-2 border-b border-white/10 px-4 py-4">
          <div className="min-w-0 flex-1">
            <img
              src="/logo.jpg"
              alt="SD"
              className="block h-auto w-full max-w-[8.4375rem] rounded-brand object-contain shadow-brand"
            />
            {user?.username ? (
              <p className="mt-2.5 truncate text-xs text-white/80">{user.username}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-brand text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/60 lg:hidden"
            aria-label="Cerrar menú"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <p className="mb-2 px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-white/50">
            GESTIÓN
          </p>
          {ITEMS.map((item) => {
            const isActive = active === item.id;
            const Icon = item.Icon;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => onClose?.()}
                className={`flex items-center gap-3 rounded-brand px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/50 ${
                  isActive
                    ? "bg-brand-primary text-white shadow-brand"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          {showEnableNotifications ? (
            <button
              type="button"
              onClick={() => onEnableNotifications?.()}
              className="mb-1 flex w-full items-center gap-2 rounded-brand px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/50"
            >
              <Bell className="h-4 w-4 shrink-0" aria-hidden />
              Activar notificaciones
            </button>
          ) : null}
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-brand px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/50"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
