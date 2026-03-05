/**
 * ExplorerPage — explorador de archivos del sistema operativo.
 * Integra: árbol de directorios, barra de tabs, editor Monaco.
 *
 * La inicialización (árbol + temporales) ocurre una sola vez gracias al guard
 * `initialized` del store. Al navegar a otras secciones y volver, el estado
 * persiste sin re-cargar ni duplicar temporales.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useExplorerStore } from "@/store/useExplorerStore.ts";
import { loadAllTempFiles, openFolderDialog } from "@/infrastructure/FsService.ts";
import { homeDir } from "@tauri-apps/api/path";
import { FileTree } from "./components/FileTree.tsx";
import { TabBar } from "./components/TabBar.tsx";
import { EditorPanel, EditorEmpty } from "./components/EditorPanel.tsx";

interface ExplorerPageProps {
  isDark: boolean;
}

/**
 * Página principal del explorador de archivos.
 */
export default function ExplorerPage({ isDark }: ExplorerPageProps) {
  const {
    openTabs,
    activeTabId,
    initialized,
    init,
    setRoot,
    closeTab,
    createTempTab,
  } = useExplorerStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        void createTempTab();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createTempTab]);

  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [dragging, setDragging] = useState(false);
  const initStarted = useRef(false);

  // ── Inicialización (solo una vez) ─────────────────────────────────────────

  useEffect(() => {
    if (initialized || initStarted.current) return;
    initStarted.current = true;

    async function initExplorer() {
      const [metas, home] = await Promise.all([
        loadAllTempFiles(),
        homeDir(),
      ]);
      await init(metas, home);
    }
    void initExplorer();
  }, [initialized, init]);


  // ── Cambio de carpeta raíz ────────────────────────────────────────────────

  const handleOpenFolderDialog = useCallback(async () => {
    const path = await openFolderDialog();
    if (path) await setRoot(path);
  }, [setRoot]);

  // ── Resize del sidebar ────────────────────────────────────────────────────

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(160, Math.min(500, startWidth + ev.clientX - startX));
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [sidebarWidth]);

  // ── Render ────────────────────────────────────────────────────────────────

  const activeTab = activeTabId ? openTabs.find((t) => t.id === activeTabId) : null;

  if (!initialized) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--color-text-muted)",
          fontSize: "15px",
          gap: "10px",
        }}
      >
        <span style={{ opacity: 0.5 }}>Cargando explorador…</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
        cursor: dragging ? "col-resize" : "default",
      }}
    >
      {/* ─── Sidebar: árbol de archivos ───────────────────────────── */}
      <div style={{ width: `${sidebarWidth}px`, flexShrink: 0, overflow: "hidden" }}>
        <FileTree onOpenFolderDialog={() => { void handleOpenFolderDialog(); }} />
      </div>

      {/* ─── Divider redimensionable ──────────────────────────────── */}
      <div
        onMouseDown={handleDividerMouseDown}
        style={{
          width: "4px",
          flexShrink: 0,
          cursor: "col-resize",
          background: dragging ? "var(--color-accent)" : "transparent",
          transition: "background 0.15s ease",
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--color-border-strong)";
        }}
        onMouseLeave={(e) => {
          if (!dragging) (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      />

      {/* ─── Panel derecho: tabs + editor ─────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TabBar onCloseTab={(id) => void closeTab(id)} />

        <div style={{ flex: 1, overflow: "hidden" }}>
          {activeTab ? (
            <EditorPanel tab={activeTab} isDark={isDark} />
          ) : (
            <EditorEmpty />
          )}
        </div>
      </div>
    </div>
  );
}
