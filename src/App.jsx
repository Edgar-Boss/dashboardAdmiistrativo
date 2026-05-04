import Layout from "./components/Layout";
import AppointmentsPage from "./pages/AppointmentsPage";

export default function App() {
  return (
    <Layout active="citas">
      <AppointmentsPage />
    </Layout>
  );
}
