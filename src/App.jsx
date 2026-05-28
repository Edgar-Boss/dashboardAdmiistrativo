import { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout";
import AppointmentsPage from "./pages/AppointmentsPage";
import DoctorsPage from "./pages/DoctorsPage";
import LoginPage from "./pages/LoginPage";
import {
  isAuthenticated,
  logout,
  setUnauthorizedHandler,
} from "./services/authService";

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated());
  const [hash, setHash] = useState(() => window.location.hash || "#citas");

  useEffect(() => {
    setUnauthorizedHandler(() => setAuthenticated(false));
  }, []);

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
    return { active: "citas", content: <AppointmentsPage /> };
  }, [route]);

  function handleLogout() {
    logout();
    setAuthenticated(false);
    window.location.hash = "#citas";
  }

  if (!authenticated) {
    return <LoginPage onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <Layout active={active} onLogout={handleLogout}>
      {content}
    </Layout>
  );
}
