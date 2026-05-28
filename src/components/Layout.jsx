import Sidebar from "./Sidebar";

export default function Layout({ children, active, onLogout }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar active={active} onLogout={onLogout} />
      <main className="min-h-screen flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
