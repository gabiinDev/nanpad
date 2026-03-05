/**
 * Punto de entrada de NANPAD.
 * Importa estilos globales y monta el árbol de componentes React.
 * La inicialización de infraestructura (DB, Composition Root) ocurre en App.tsx.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import loader from "@monaco-editor/loader";
import "./App.css";
import App from "./App.tsx";
import { installWebView2DndPolyfill } from "./webview2-dnd-polyfill.ts";

// Monaco: cargar desde mismo origen para evitar Tracking Prevention (CDN bloqueado).
loader.config({ paths: { vs: "/monaco-editor-min/vs" } });

// Silenciar rechazos por cancelación esperada (loader y Monaco al desmontar).
window.addEventListener("unhandledrejection", (event) => {
  const r = event.reason;
  if (!r) return;
  // Loader: useMonaco cancela al desmontar sin .catch()
  if (typeof r === "object" && r.type === "cancelation" && r.msg === "operation is manually canceled") {
    event.preventDefault();
    return;
  }
  // Monaco: al cambiar a solo preview el editor se dispone y cancela promesas internas ("Canceled").
  const msg = r instanceof Error ? r.message : typeof r === "string" ? r : (r as { message?: string })?.message;
  if (msg === "Canceled" || msg === "Canceled: Canceled") {
    event.preventDefault();
  }
});

// Activa el polyfill de drag & drop para WebView2 (Tauri en Windows).
// El arrastre HTML5 nativo no funciona en WebView2 sin este parche.
installWebView2DndPolyfill();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
