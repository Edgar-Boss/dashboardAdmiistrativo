import Sidebar from "./Sidebar";

export default function Layout({ children, active }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar active={active} />
      <main className="min-h-screen flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
