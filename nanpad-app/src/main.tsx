/**
 * Punto de entrada de NANPAD.
 * Importa estilos globales y monta el árbol de componentes React.
 * La inicialización de infraestructura (DB, Composition Root) ocurre en App.tsx.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import App from "./App.tsx";
import { installWebView2DndPolyfill } from "./webview2-dnd-polyfill.ts";

// Activa el polyfill de drag & drop para WebView2 (Tauri en Windows).
// El arrastre HTML5 nativo no funciona en WebView2 sin este parche.
installWebView2DndPolyfill();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
