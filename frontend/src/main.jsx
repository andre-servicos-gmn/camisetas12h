import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Fontes auto-hospedadas (sem depender de CDN externo na demo).
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";

import "./index.css";
import App from "./App";
import { aplicarTema, temaInicial } from "./lib/theme";

// Aplica o tema salvo antes do primeiro paint (evita flash de tema errado).
aplicarTema(temaInicial());

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
