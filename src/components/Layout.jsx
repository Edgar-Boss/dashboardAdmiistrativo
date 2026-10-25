import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

export default function Layout({
  children,
  active,
  onLogout,
  notificationPermission,
  onEnableNotifications,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [active]);

  return (
    <div className="flex min-h-screen bg-brand-background">
      <Sidebar
        active={active}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        notificationPermission={notificationPermission}
        onEnableNotifications={onEnableNotifications}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-brand-background">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-brand-border bg-brand-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-brand border border-brand-border bg-brand-surface text-brand-text shadow-brand transition hover:bg-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0">
            <img
              src="/logo.jpg"
              alt="SD"
              className="h-[1.6875rem] w-auto max-w-[7.125rem] object-contain object-left"
            />
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
