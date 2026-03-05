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
      <div className="flex h-full items-center justify-center gap-2.5 text-[var(--color-text-muted)]">
        <span className="opacity-50">Cargando explorador…</span>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-0 h-full overflow-hidden ${dragging ? "cursor-col-resize" : "cursor-default"}`}
    >
      {/* Sidebar: altura 100% del padre, min-h-0 para scroll interno del árbol */}
      <div
        className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden"
        style={{ width: sidebarWidth }}
      >
        <FileTree onOpenFolderDialog={() => { void handleOpenFolderDialog(); }} />
      </div>

      {/* Divider redimensionable: área táctil suficiente */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleDividerMouseDown}
        className="z-10 w-1 shrink-0 cursor-col-resize transition-colors duration-150 hover:bg-[var(--color-border-strong)]"
        style={{
          background: dragging ? "var(--color-accent)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!dragging) (e.currentTarget as HTMLElement).style.background = "var(--color-border-strong)";
        }}
        onMouseLeave={(e) => {
          if (!dragging) (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      />

      {/* Panel derecho: tabs + editor, flex fluid */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TabBar onCloseTab={(id) => void closeTab(id)} />
        <div className="min-h-0 flex-1 overflow-hidden">
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
