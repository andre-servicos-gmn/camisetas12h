import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import PainelTV from "./pages/PainelTV";
import Buscar from "./pages/Buscar";
import Pedido from "./pages/Pedido";
import Integracoes from "./pages/Integracoes";
import Assistente from "./pages/Assistente";

export default function App() {
  return (
    <Routes>
      {/* Painel de TV: tela cheia, sem chrome lateral (pensado para o telão). */}
      <Route path="/tv" element={<PainelTV />} />

      {/* Demais telas: com a navegação lateral. */}
      <Route
        path="/"
        element={
          <Layout>
            <Dashboard />
          </Layout>
        }
      />
      <Route
        path="/buscar"
        element={
          <Layout>
            <Buscar />
          </Layout>
        }
      />
      <Route
        path="/pedido/:numero"
        element={
          <Layout>
            <Pedido />
          </Layout>
        }
      />
      <Route
        path="/integracoes"
        element={
          <Layout>
            <Integracoes />
          </Layout>
        }
      />
      <Route
        path="/assistente"
        element={
          <Layout>
            <Assistente />
          </Layout>
        }
      />
    </Routes>
  );
}
