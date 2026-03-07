/**
 * ExplorerPage — explorador de archivos del sistema operativo.
 * Integra: árbol de directorios, barra de tabs, editor Monaco.
 *
 * La inicialización (árbol + temporales) ocurre una sola vez gracias al guard
 * `initialized` del store. Al navegar a otras secciones y volver, el estado
 * persiste sin re-cargar ni duplicar temporales.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useApp } from "@app/AppContext.tsx";
import { useExplorerStore, getSessionFromStore, type PersistedSession } from "@/store/useExplorerStore.ts";
import { useExplorerFloatingSearchStore } from "@/store/useExplorerFloatingSearchStore.ts";
import { loadAllTempFiles, openFolderDialog } from "@/infrastructure/FsService.ts";
import { homeDir } from "@tauri-apps/api/path";
import { FileTree } from "./components/FileTree.tsx";
import { TabBar } from "./components/TabBar.tsx";
import { EditorPanel, EditorEmpty } from "./components/EditorPanel.tsx";
import { ExplorerFloatingSearch } from "./components/ExplorerFloatingSearch.tsx";

interface ExplorerPageProps {
  isDark: boolean;
}

/**
 * Página principal del explorador de archivos.
 */
export default function ExplorerPage({ isDark }: ExplorerPageProps) {
  const { loadExplorerSession, saveExplorerSession } = useApp();
  const {
    openTabs,
    activeTabId,
    mdViewModes,
    closedTabsStack,
    favoriteFolders,
    favoritesPanelExpanded,
    languageOverrides,
    initialized,
    init,
    setRoot,
    closeTab,
    openFileByPath,
    createTempTab,
    restoreLastClosedTab,
  } = useExplorerStore();

  const setFloatingSearchOpen = useExplorerFloatingSearchStore((s) => s.setOpen);

  // Drag & drop de archivos externos: abrir como tab al soltar
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const webview = getCurrentWebview();
        const fn = await webview.onDragDropEvent((event) => {
          if (event.payload.type === "drop" && event.payload.paths?.length) {
            const path = event.payload.paths[0];
            if (path && typeof path === "string") {
              void openFileByPath(path);
            }
          }
        });
        if (!cancelled) unlisten = fn;
        else fn();
      } catch {
        // No disponible en entorno no-Tauri (ej. navegador)
      }
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [openFileByPath]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        void createTempTab();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setFloatingSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") {
        const el = document.activeElement;
        if (el instanceof HTMLElement) {
          const tag = el.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA") return;
          if (el.isContentEditable || el.closest(".monaco-editor")) return;
        }
        e.preventDefault();
        void restoreLastClosedTab();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createTempTab, restoreLastClosedTab, setFloatingSearchOpen]);

  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [dragging, setDragging] = useState(false);
  const initStarted = useRef(false);

  // ── Inicialización (solo una vez) ─────────────────────────────────────────

  useEffect(() => {
    if (initialized || initStarted.current) return;
    initStarted.current = true;

    async function initExplorer() {
      const [metas, home, session] = await Promise.all([
        loadAllTempFiles(),
        homeDir(),
        loadExplorerSession(),
      ]);
      await init(metas, home, (session ?? undefined) as PersistedSession | undefined);
    }
    void initExplorer();
  }, [initialized, init, loadExplorerSession]);

  // Persistir sesión en SQLite con debounce para no saturar la DB (solo tras init).
  // La sesión se "limpia" automáticamente: guardamos el estado actual de openTabs,
  // que no incluye paths cuyos archivos ya no existían al restaurar.
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initialized) return;
    const DEBOUNCE_MS = 500;
    if (saveTimeoutRef.current !== null) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      const session = getSessionFromStore(openTabs, activeTabId, mdViewModes, closedTabsStack, favoriteFolders, languageOverrides, favoritesPanelExpanded);
      void saveExplorerSession(session);
    }, DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [initialized, openTabs, activeTabId, mdViewModes, closedTabsStack, favoriteFolders, favoritesPanelExpanded, languageOverrides, saveExplorerSession]);

  // Flush al cerrar/ocultar la ventana para no perder el último estado
  useEffect(() => {
    if (!initialized) return;
    const flush = () => {
      const state = useExplorerStore.getState();
      const session = getSessionFromStore(
        state.openTabs,
        state.activeTabId,
        state.mdViewModes,
        state.closedTabsStack,
        state.favoriteFolders,
        state.languageOverrides,
        state.favoritesPanelExpanded
      );
      void saveExplorerSession(session);
    };
    const onBeforeUnload = () => { flush(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [initialized, saveExplorerSession]);


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
      <ExplorerFloatingSearch />
    </div>
  );
}
