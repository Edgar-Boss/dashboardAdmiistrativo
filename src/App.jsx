import { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout";
import AppointmentsPage from "./pages/AppointmentsPage";
import DoctorsPage from "./pages/DoctorsPage";

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash || "#citas");

  useEffect(() => {
    function onHashChange() {
      setHash(window.location.hash || "#citas");
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const route = useMemo(() => {
    const raw = String(hash || "").replace(/^#/, "");
    return raw || "citas";
  }, [hash]);

  const { active, content } = useMemo(() => {
    if (route === "doctores") {
      return { active: "doctores", content: <DoctorsPage /> };
    }
    // Default
    return { active: "citas", content: <AppointmentsPage /> };
  }, [route]);

  return (
    <Layout active={active}>{content}</Layout>
  );
}
