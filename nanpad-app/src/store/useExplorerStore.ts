/**
 * useExplorerStore — estado global del explorador de archivos.
 * Gestiona: árbol de directorios, tabs abiertos, archivos temporales, carpeta raíz.
 *
 * El store es un singleton de Zustand y persiste en memoria entre cambios de ruta.
 * La inicialización (initRoot + restoreTempFiles) debe hacerse UNA SOLA VEZ al arrancar la app.
 */

import { create } from "zustand";
import type { FsNode, TempFileMeta } from "@/infrastructure/FsService.ts";
import {
  listDir,
  readFile,
  writeFile,
  createFile,
  deleteEntry,
  renameEntry,
  createDir,
  saveTempFile,
  deleteTempFile,
  saveFileDialog,
} from "@/infrastructure/FsService.ts";

const ROOT_PATH_KEY = "nanpad_explorer_root";
const MAX_PERSISTED_REAL_TABS = 30;
const MAX_UNDO_REDO_STEPS = 10;
const MAX_CLOSED_TABS = 10;

/** Info mínima de un tab cerrado para poder reabrirlo (Ctrl+Shift+Z). */
export interface ClosedTabInfo {
  id: string;
  path: string | null;
  label: string;
  content: string;
  isTemp: boolean;
  ext?: string;
}

/** Modo de panel para archivos .md en el editor. */
export type MdPanelMode = "editor" | "split" | "preview";

/** Sesión persistida: solo paths de tabs reales fijados y tab activo (para SQLite). */
export interface PersistedSession {
  /** Paths en el orden actual de la barra de tabs (incluye drag-and-drop). */
  realTabIds: string[];
  activeTabId: string | null;
  /** Por tab (path): modo de vista y ratio del split para archivos .md. */
  mdViewModes?: Record<string, { mode: MdPanelMode; splitRatio: number }>;
  /** Últimos tabs cerrados (máx. 10) para restaurar con Ctrl+Shift+Z. */
  closedTabsStack?: ClosedTabInfo[];
}

/**
 * Construye la sesión a persistir a partir del estado actual de tabs.
 * Solo incluye tabs reales fijados (no temporales ni preview sin fijar).
 * El orden de realTabIds es el de openTabs, así que el reordenado por drag-and-drop se persiste.
 * mdViewModes se incluye solo para tabs reales que son .md/.mdx.
 */
export function getSessionFromStore(
  openTabs: OpenTab[],
  activeTabId: string | null,
  mdViewModes: Record<string, { mode: MdPanelMode; splitRatio: number }>,
  closedTabsStack?: ClosedTabInfo[]
): PersistedSession {
  const real = openTabs.filter((t) => t.path !== null && t.isPinned && !t.isTemp);
  const realTabIds = real.map((t) => t.path as string).slice(0, MAX_PERSISTED_REAL_TABS);
  const active =
    activeTabId && realTabIds.includes(activeTabId)
      ? activeTabId
      : (realTabIds[0] ?? null);
  const realSet = new Set(realTabIds);
  const isMd = (ext?: string) => ext === "md" || ext === "mdx";
  const mdViewModesFiltered: Record<string, { mode: MdPanelMode; splitRatio: number }> = {};
  for (const [tabId, value] of Object.entries(mdViewModes)) {
    if (!realSet.has(tabId)) continue;
    const tab = real.find((t) => t.id === tabId);
    if (tab && isMd(tab.ext)) mdViewModesFiltered[tabId] = value;
  }
  const closed = closedTabsStack?.length ? closedTabsStack.slice(-MAX_CLOSED_TABS) : undefined;
  return {
    realTabIds,
    activeTabId: active,
    mdViewModes: Object.keys(mdViewModesFiltered).length > 0 ? mdViewModesFiltered : undefined,
    closedTabsStack: closed,
  };
}

/** Un tab abierto en el editor — puede ser un archivo real o un temporal. */
export interface OpenTab {
  /** ID único del tab. Para temporales, es el tempId (nanpad_temp_*). Para reales, es la ruta absoluta. */
  id: string;
  /** Nombre visible del tab (ej. "#Temp abc123" para temporales, nombre de archivo para reales). */
  label: string;
  /** Ruta absoluta del archivo en disco. null para temporales. */
  path: string | null;
  /** Contenido actual del editor. */
  content: string;
  /** Es un archivo temporal (nota rápida). */
  isTemp: boolean;
  /** Tiene cambios no guardados. */
  isDirty: boolean;
  /** Extensión del archivo (sin punto, lowercase), para detección de lenguaje. */
  ext?: string;
  /**
   * Tab fijado — permanece abierto aunque se abra otro por single-click.
   * Los tabs temporales y los abiertos con doble-click siempre están fijados.
   * El preview de single-click NO está fijado hasta que el usuario lo fija.
   */
  isPinned: boolean;
}

interface ExplorerStore {
  /** Carpeta raíz del árbol. */
  rootPath: string;
  /** Árbol de nodos de la raíz (primer nivel cargado). */
  tree: FsNode[];
  /** Tabs abiertos. */
  openTabs: OpenTab[];
  /** ID del tab activo. */
  activeTabId: string | null;
  /** Cargando el árbol. */
  loadingTree: boolean;
  /** Error general. */
  error: string | null;
  /** Si ya se inicializó el store (para evitar doble carga al montar ExplorerPage). */
  initialized: boolean;
  /** Inicialización en curso (evita que Shell y ExplorerPage llamen init a la vez). */
  initInProgress: boolean;
  /**
   * Modo de vista por tab para archivos .md (editor / dividido / vista previa) y ratio del split.
   * Clave = tab id (path para archivos reales).
   */
  mdViewModes: Record<string, { mode: MdPanelMode; splitRatio: number }>;
  /** Pilas de undo por tab (últimos MAX_UNDO_REDO_STEPS contenidos anteriores). */
  undoStacks: Record<string, string[]>;
  /** Pilas de redo por tab. */
  redoStacks: Record<string, string[]>;
  /** Contenido "base" por tab: si content === baseline, isDirty = false. */
  tabBaselineContent: Record<string, string>;
  /** Últimos tabs cerrados (máx. 10), el más reciente al final; se restaura con Ctrl+Shift+Z. */
  closedTabsStack: ClosedTabInfo[];

  // ── Inicialización ─────────────────────────────────────────────────────────
  /**
   * Inicializa raíz y temporales. Idempotente: si ya inicializó, no hace nada.
   * @param session - Sesión restaurada desde DB (tabs reales + activo); si no se pasa, no se restauran tabs reales.
   */
  init: (metas: TempFileMeta[], homeDir: string, session?: PersistedSession | null) => Promise<void>;
  /** Marca como inicializado externamente (si init se llama desde fuera del store). */
  markInitialized: () => void;

  // ── Acciones de raíz ───────────────────────────────────────────────────────
  /** Cambia la carpeta raíz y la persiste. */
  setRoot: (path: string) => Promise<void>;
  /** Recarga el árbol desde el rootPath actual. */
  reloadTree: () => Promise<void>;
  /** Carga los hijos de un nodo de directorio (lazy). */
  expandDir: (nodePath: string) => Promise<void>;
  /** Colapsa un directorio (descarta sus hijos del árbol en memoria). */
  collapseDir: (nodePath: string) => void;

  // ── Acciones de archivos ───────────────────────────────────────────────────
  /**
   * Abre un archivo en modo "preview" temporal: si ya hay un preview activo y
   * aún no fue fijado, lo reemplaza. Se fija con `pinTab` o doble click en el árbol.
   */
  previewFile: (node: FsNode) => Promise<void>;
  /** Fija el tab activo (convierte un preview en tab permanente). */
  pinTab: (id: string) => void;
  /** Abre un archivo real en un tab (o lo activa si ya está abierto). */
  openFile: (node: FsNode) => Promise<void>;
  /** Crea un nuevo archivo en la ruta dada y lo abre. */
  createNewFile: (dirPath: string, name: string) => Promise<void>;
  /** Crea un nuevo directorio. */
  createNewDir: (parentPath: string, name: string) => Promise<void>;
  /** Elimina un archivo o directorio del disco y cierra sus tabs. */
  deleteNode: (node: FsNode) => Promise<void>;
  /** Renombra un archivo o directorio. */
  renameNode: (node: FsNode, newName: string) => Promise<void>;

  // ── Acciones de tabs ───────────────────────────────────────────────────────
  /** Activa un tab existente. */
  setActiveTab: (id: string) => void;
  /** Reordena los tabs: mueve el tab en fromIndex a toIndex. */
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  /**
   * Cierra un tab.
   * - Archivo real con cambios sin guardar: pide confirmación.
   * - Archivo temporal: pide si guardar en disco o descartar (elimina físico si descarta).
   */
  closeTab: (id: string) => Promise<void>;
  /** Actualiza el contenido de un tab (editor onChange). Los temporales se autoguardan en AppData. */
  updateTabContent: (id: string, content: string) => void;
  /** Guarda el contenido de un tab real en disco. */
  saveTab: (id: string) => Promise<void>;
  /** Establece modo de vista (y opcionalmente ratio) para un tab .md; se persiste en sesión. */
  setMdViewMode: (tabId: string, mode: MdPanelMode, splitRatio?: number) => void;
  /** Registra el contenido anterior antes de un cambio (para undo); máx. 10 por tab. */
  pushUndo: (tabId: string, previousContent: string) => void;
  /** Deshace un paso; devuelve true si se aplicó. */
  undo: (tabId: string) => boolean;
  /** Rehace un paso; devuelve true si se aplicó. */
  redo: (tabId: string) => boolean;
  /** Restaura el último tab cerrado (al final de la barra); máx. 10 en la pila. */
  restoreLastClosedTab: () => Promise<void>;

  // ── Archivos temporales ────────────────────────────────────────────────────
  /**
   * Crea una nueva nota temporal con nombre basado en short-guid.
   * El archivo físico se escribe de inmediato en AppLocalData.
   */
  createTempTab: () => Promise<void>;
  /** Convierte un temporal en archivo real (ruta dada por el usuario). */
  saveTempAsDisk: (tabId: string, diskPath: string) => Promise<void>;
  /**
   * Abre el diálogo del sistema para elegir dónde guardar un temporal (Ctrl+S en nota temporal).
   */
  saveTempWithDialog: (tabId: string) => Promise<void>;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function getExt(name: string): string | undefined {
  const idx = name.lastIndexOf(".");
  if (idx < 0 || idx === name.length - 1) return undefined;
  return name.slice(idx + 1).toLowerCase();
}

/** Extrae un short-guid de 8 chars del tempId (nanpad_temp_<timestamp>_<random>). */
function shortGuid(tempId: string): string {
  const parts = tempId.split("_");
  return parts[parts.length - 1]?.slice(0, 8) ?? tempId.slice(-8);
}

function setChildrenInTree(tree: FsNode[], targetPath: string, children: FsNode[] | undefined): FsNode[] {
  return tree.map((node) => {
    if (node.path === targetPath) return { ...node, children };
    if (node.children) return { ...node, children: setChildrenInTree(node.children, targetPath, children) };
    return node;
  });
}

/** Recorre el árbol y devuelve los paths de directorios que tienen hijos cargados. */
function collectExpandedPaths(tree: FsNode[]): Set<string> {
  const paths = new Set<string>();
  function walk(nodes: FsNode[]) {
    for (const n of nodes) {
      if (n.isDir && Array.isArray(n.children)) {
        paths.add(n.path);
        walk(n.children);
      }
    }
  }
  walk(tree);
  return paths;
}

/**
 * Re-expande los directorios que estaban abiertos antes del reload.
 * Hace las llamadas a listDir en paralelo por nivel para no bloquear.
 */
async function restoreExpanded(tree: FsNode[], expanded: Set<string>): Promise<FsNode[]> {
  if (expanded.size === 0) return tree;
  return Promise.all(
    tree.map(async (node): Promise<FsNode> => {
      if (node.isDir && expanded.has(node.path)) {
        try {
          const children = await listDir(node.path);
          const restored = await restoreExpanded(children, expanded);
          return { ...node, children: restored };
        } catch {
          return node;
        }
      }
      return node;
    })
  );
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useExplorerStore = create<ExplorerStore>((set, get) => ({
  rootPath: "",
  tree: [],
  openTabs: [],
  activeTabId: null,
  loadingTree: false,
  error: null,
  initialized: false,
  initInProgress: false,
  mdViewModes: {},
  undoStacks: {},
  redoStacks: {},
  tabBaselineContent: {},
  closedTabsStack: [],

  // ── Inicialización ────────────────────────────────────────────────────────

  init: async (metas, homeDir, session) => {
    if (get().initialized || get().initInProgress) return;
    set({ initInProgress: true });
    try {
    // Determinar raíz (sigue en localStorage: poco peso y disponible antes de DB)
    const saved = localStorage.getItem(ROOT_PATH_KEY);
    const rootPath = saved ?? homeDir;
    localStorage.setItem(ROOT_PATH_KEY, rootPath);

    set({ rootPath, loadingTree: true, error: null });

    // Cargar árbol y temporales en paralelo
    const [tree] = await Promise.all([
      listDir(rootPath).catch(() => []),
    ]);

    // Construir tabs de temporales
    const tempTabs: OpenTab[] = metas.map((m) => ({
      id: m.tempId,
      label: `#Temp ${shortGuid(m.tempId)}`,
      path: null,
      content: m.content,
      isTemp: true,
      isDirty: false,
      ext: "txt",
      isPinned: true,
    }));

    // Restaurar tabs reales desde la sesión (viene de SQLite desde ExplorerPage).
    // Los paths cuyo archivo ya no existe se omiten; al persistir de nuevo
    // guardamos solo el estado actual (openTabs), así que la sesión se limpia sola.
    const restoredTabs: OpenTab[] = [];
    if (session?.realTabIds.length) {
      for (const path of session.realTabIds.slice(0, MAX_PERSISTED_REAL_TABS)) {
        try {
          const content = await readFile(path);
          const name = path.replace(/\\/g, "/").split("/").pop() ?? path;
          restoredTabs.push({
            id: path,
            label: name,
            path,
            content,
            isTemp: false,
            isDirty: false,
            ext: getExt(name),
            isPinned: true,
          });
        } catch {
          // Archivo ya no existe o no accesible: omitir (no se añade a restoredTabs)
        }
      }
    }

    const openTabs = [...tempTabs, ...restoredTabs];
    const candidateActive =
      session?.activeTabId && restoredTabs.some((t) => t.id === session.activeTabId)
        ? session.activeTabId
        : openTabs[0]?.id ?? null;
    const activeTabId =
      candidateActive && openTabs.some((t) => t.id === candidateActive)
        ? candidateActive
        : openTabs[0]?.id ?? null;

    // Restaurar modos de vista .md solo para tabs que sí se restauraron
    const restoredIds = new Set(restoredTabs.map((t) => t.id));
    const mdViewModes =
      session?.mdViewModes && Object.keys(session.mdViewModes).length > 0
        ? Object.fromEntries(
            Object.entries(session.mdViewModes).filter(([id]) => restoredIds.has(id))
          ) as Record<string, { mode: MdPanelMode; splitRatio: number }>
        : {};

    const tabBaselineContent = Object.fromEntries(openTabs.map((t) => [t.id, t.content]));
    const closedTabsStack = session?.closedTabsStack?.length
      ? session.closedTabsStack.slice(-MAX_CLOSED_TABS)
      : [];
    set({
      tree,
      loadingTree: false,
      openTabs,
      activeTabId,
      mdViewModes,
      tabBaselineContent,
      closedTabsStack,
      initialized: true,
      initInProgress: false,
    });
    } finally {
      set({ initInProgress: false });
    }
  },

  markInitialized: () => set({ initialized: true }),

  // ── Raíz ──────────────────────────────────────────────────────────────────

  setRoot: async (path) => {
    localStorage.setItem(ROOT_PATH_KEY, path);
    set({ rootPath: path, loadingTree: true, error: null });
    try {
      const tree = await listDir(path);
      set({ tree, loadingTree: false });
    } catch (e) {
      set({ loadingTree: false, error: String(e) });
    }
  },

  reloadTree: async () => {
    const { rootPath, tree } = get();
    if (!rootPath) return;
    set({ loadingTree: true });
    try {
      const freshTree = await listDir(rootPath);
      // Restaurar el estado expandido de los directorios que ya tenían hijos cargados
      const expandedPaths = collectExpandedPaths(tree);
      const restoredTree = await restoreExpanded(freshTree, expandedPaths);
      set({ tree: restoredTree, loadingTree: false });
    } catch (e) {
      set({ loadingTree: false, error: String(e) });
    }
  },

  expandDir: async (nodePath) => {
    const children = await listDir(nodePath);
    set((state) => ({
      tree: setChildrenInTree(state.tree, nodePath, children),
    }));
  },

  collapseDir: (nodePath) => {
    set((state) => ({
      tree: setChildrenInTree(state.tree, nodePath, undefined),
    }));
  },

  // ── Archivos reales ───────────────────────────────────────────────────────

  previewFile: async (node) => {
    const { openTabs } = get();

    // Si el archivo ya tiene un tab fijado, simplemente activarlo
    const pinned = openTabs.find((t) => t.path === node.path && t.isPinned);
    if (pinned) {
      set({ activeTabId: pinned.id });
      return;
    }

    // Si ya hay un preview sin fijar (tab temporal de vista previa), reutilizarlo
    const existingPreview = openTabs.find((t) => !t.isPinned && !t.isTemp);
    let content = "";
    try {
      content = await readFile(node.path);
    } catch { content = ""; }

    const tab: OpenTab = {
      id: node.path,
      label: node.name,
      path: node.path,
      content,
      isTemp: false,
      isDirty: false,
      ext: node.ext,
      isPinned: false,
    };

    if (existingPreview) {
      set((state) => ({
        openTabs: state.openTabs.map((t) => t.id === existingPreview.id ? tab : t),
        activeTabId: tab.id,
        tabBaselineContent: { ...state.tabBaselineContent, [tab.id]: tab.content },
      }));
    } else {
      set((state) => ({
        openTabs: [...state.openTabs, tab],
        activeTabId: tab.id,
        tabBaselineContent: { ...state.tabBaselineContent, [tab.id]: tab.content },
      }));
    }
  },

  pinTab: (id) => {
    set((state) => ({
      openTabs: state.openTabs.map((t) => t.id === id ? { ...t, isPinned: true } : t),
    }));
  },

  openFile: async (node) => {
    const { openTabs } = get();
    const existing = openTabs.find((t) => t.path === node.path);
    if (existing) {
      // Si ya existe (aunque sea preview), fijarlo y activarlo
      set((state) => ({
        openTabs: state.openTabs.map((t) => t.id === existing.id ? { ...t, isPinned: true } : t),
        activeTabId: existing.id,
      }));
      return;
    }
    let content = "";
    try {
      content = await readFile(node.path);
    } catch {
      content = "";
    }
    // Reemplazar el preview sin fijar si existe
    const existingPreview = get().openTabs.find((t) => !t.isPinned && !t.isTemp);
    const tab: OpenTab = {
      id: node.path,
      label: node.name,
      path: node.path,
      content,
      isTemp: false,
      isDirty: false,
      ext: node.ext,
      isPinned: true,
    };
    if (existingPreview) {
      set((state) => ({
        openTabs: state.openTabs.map((t) => t.id === existingPreview.id ? tab : t),
        activeTabId: tab.id,
        tabBaselineContent: { ...state.tabBaselineContent, [tab.id]: tab.content },
      }));
    } else {
      set((state) => ({
        openTabs: [...state.openTabs, tab],
        activeTabId: tab.id,
        tabBaselineContent: { ...state.tabBaselineContent, [tab.id]: tab.content },
      }));
    }
  },

  createNewFile: async (dirPath, name) => {
    const normalDir = dirPath.replace(/\\/g, "/").replace(/\/$/, "");
    const filePath = `${normalDir}/${name}`;
    await createFile(filePath);
    await get().reloadTree();
    const ext = getExt(name);
    const tab: OpenTab = {
      id: filePath,
      label: name,
      path: filePath,
      content: "",
      isTemp: false,
      isDirty: false,
      ext,
      isPinned: true,
    };
    set((state) => ({
      openTabs: [...state.openTabs, tab],
      activeTabId: tab.id,
      tabBaselineContent: { ...state.tabBaselineContent, [tab.id]: tab.content },
    }));
  },

  createNewDir: async (parentPath, name) => {
    const normalParent = parentPath.replace(/\\/g, "/").replace(/\/$/, "");
    await createDir(`${normalParent}/${name}`);
    await get().reloadTree();
  },

  deleteNode: async (node) => {
    await deleteEntry(node.path, node.isDir);
    set((state) => {
      const tabs = state.openTabs.filter((t) => t.path === null || !t.path.startsWith(node.path));
      const active = tabs.find((t) => t.id === state.activeTabId) ? state.activeTabId : (tabs[0]?.id ?? null);
      return { openTabs: tabs, activeTabId: active };
    });
    await get().reloadTree();
  },

  renameNode: async (node, newName) => {
    const sep = node.path.includes("/") ? "/" : "\\";
    const dir = node.path.substring(0, node.path.lastIndexOf(sep));
    const newPath = `${dir}${sep}${newName}`;
    await renameEntry(node.path, newPath);
    set((state) => ({
      openTabs: state.openTabs.map((t) => {
        if (t.path === node.path) {
          return { ...t, id: newPath, path: newPath, label: newName, ext: getExt(newName) };
        }
        return t;
      }),
      activeTabId: state.activeTabId === node.path ? newPath : state.activeTabId,
    }));
    await get().reloadTree();
  },

  // ── Tabs ──────────────────────────────────────────────────────────────────

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  reorderTabs: (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    set((state) => {
      const tabs = [...state.openTabs];
      const [removed] = tabs.splice(fromIndex, 1);
      if (!removed) return state;
      const insertIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
      tabs.splice(insertIndex, 0, removed);
      return { openTabs: tabs };
    });
  },

  closeTab: async (id) => {
    const tab = get().openTabs.find((t) => t.id === id);
    if (!tab) return;

    const closedInfo: ClosedTabInfo = {
      id: tab.id,
      path: tab.path,
      label: tab.label,
      content: tab.content,
      isTemp: tab.isTemp,
      ext: tab.ext,
    };

    if (tab.isTemp) {
      await deleteTempFile(id);
    }

    set((state) => {
      const tabs = state.openTabs.filter((t) => t.id !== id);
      let active = state.activeTabId;
      if (active === id) {
        const idx = state.openTabs.findIndex((t) => t.id === id);
        active = tabs[idx]?.id ?? tabs[Math.max(0, idx - 1)]?.id ?? null;
      }
      const { [id]: _u, ...undoStacks } = state.undoStacks;
      const { [id]: _r, ...redoStacks } = state.redoStacks;
      const { [id]: _b, ...tabBaselineContent } = state.tabBaselineContent;
      const closedTabsStack = [...(state.closedTabsStack ?? []), closedInfo].slice(-MAX_CLOSED_TABS);
      return {
        openTabs: tabs,
        activeTabId: active,
        undoStacks,
        redoStacks,
        tabBaselineContent,
        closedTabsStack,
      };
    });
  },

  updateTabContent: (id, content) => {
    const baseline = get().tabBaselineContent[id];
    const isDirty = baseline === undefined || content !== baseline;
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.id === id ? { ...t, content, isDirty } : t
      ),
    }));
    const tab = get().openTabs.find((t) => t.id === id);
    if (tab?.isTemp) {
      void saveTempFile(tab.id, content);
    }
  },

  saveTab: async (id) => {
    const tab = get().openTabs.find((t) => t.id === id);
    if (!tab || !tab.path) return;
    await writeFile(tab.path, tab.content);
    set((state) => ({
      openTabs: state.openTabs.map((t) => (t.id === id ? { ...t, isDirty: false } : t)),
      tabBaselineContent: { ...state.tabBaselineContent, [id]: tab.content },
    }));
  },

  setMdViewMode: (tabId, mode, splitRatio) => {
    set((state) => {
      const prev = state.mdViewModes[tabId] ?? { mode: "preview", splitRatio: 0.5 };
      const next: { mode: MdPanelMode; splitRatio: number } = {
        mode,
        splitRatio: splitRatio ?? prev.splitRatio,
      };
      return {
        mdViewModes: { ...state.mdViewModes, [tabId]: next },
      };
    });
  },

  pushUndo: (tabId, previousContent) => {
    set((state) => {
      const tab = state.openTabs.find((t) => t.id === tabId);
      if (!tab || tab.content === previousContent) return state;
      const stack = state.undoStacks[tabId] ?? [];
      if (stack.length > 0 && stack[stack.length - 1] === previousContent) return state;
      // Encolado: al llegar a 11, el más antiguo se pierde (slice(-10))
      const nextStack = [...stack, previousContent].slice(-MAX_UNDO_REDO_STEPS);
      const nextRedo = { ...state.redoStacks, [tabId]: [] };
      return {
        undoStacks: { ...state.undoStacks, [tabId]: nextStack },
        redoStacks: nextRedo,
      };
    });
  },

  undo: (tabId) => {
    let applied = false;
    const baseline = get().tabBaselineContent[tabId];
    set((state) => {
      const tab = state.openTabs.find((t) => t.id === tabId);
      const stack = state.undoStacks[tabId] ?? [];
      if (!tab || stack.length === 0) return state;
      applied = true;
      const previousContent = stack[stack.length - 1];
      const nextUndo = stack.slice(0, -1);
      const redoStack = state.redoStacks[tabId] ?? [];
      const nextRedo = [...redoStack, tab.content].slice(-MAX_UNDO_REDO_STEPS);
      const isDirty = baseline === undefined || previousContent !== baseline;
      return {
        openTabs: state.openTabs.map((t) =>
          t.id === tabId ? { ...t, content: previousContent, isDirty } : t
        ),
        undoStacks: { ...state.undoStacks, [tabId]: nextUndo },
        redoStacks: { ...state.redoStacks, [tabId]: nextRedo },
      };
    });
    return applied;
  },

  redo: (tabId) => {
    let applied = false;
    const baseline = get().tabBaselineContent[tabId];
    set((state) => {
      const tab = state.openTabs.find((t) => t.id === tabId);
      const stack = state.redoStacks[tabId] ?? [];
      if (!tab || stack.length === 0) return state;
      applied = true;
      const nextContent = stack[stack.length - 1];
      const nextRedo = stack.slice(0, -1);
      const undoStack = state.undoStacks[tabId] ?? [];
      const nextUndo = [...undoStack, tab.content].slice(-MAX_UNDO_REDO_STEPS);
      const isDirty = baseline === undefined || nextContent !== baseline;
      return {
        openTabs: state.openTabs.map((t) =>
          t.id === tabId ? { ...t, content: nextContent, isDirty } : t
        ),
        undoStacks: { ...state.undoStacks, [tabId]: nextUndo },
        redoStacks: { ...state.redoStacks, [tabId]: nextRedo },
      };
    });
    return applied;
  },

  restoreLastClosedTab: async () => {
    const state = get();
    const stack = state.closedTabsStack;
    if (!stack.length) return;
    const info = stack[stack.length - 1];
    set((s) => ({
      closedTabsStack: s.closedTabsStack.slice(0, -1),
    }));
    if (info.isTemp) {
      await saveTempFile(info.id, info.content);
      const tab: OpenTab = {
        id: info.id,
        label: info.label,
        path: null,
        content: info.content,
        isTemp: true,
        isDirty: false,
        ext: info.ext ?? "txt",
        isPinned: true,
      };
      set((s) => ({
        openTabs: [...s.openTabs, tab],
        activeTabId: tab.id,
        tabBaselineContent: { ...s.tabBaselineContent, [tab.id]: tab.content },
      }));
    } else if (info.path) {
      try {
        const content = await readFile(info.path);
        const name = info.path.replace(/\\/g, "/").split("/").pop() ?? info.path;
        const tab: OpenTab = {
          id: info.path,
          label: name,
          path: info.path,
          content,
          isTemp: false,
          isDirty: false,
          ext: info.ext ?? getExt(name),
          isPinned: true,
        };
        set((s) => ({
          openTabs: [...s.openTabs, tab],
          activeTabId: tab.id,
          tabBaselineContent: { ...s.tabBaselineContent, [tab.id]: content },
        }));
      } catch {
        set((s) => ({
          closedTabsStack: [...s.closedTabsStack, info].slice(-MAX_CLOSED_TABS),
        }));
      }
    }
  },

  // ── Temporales ────────────────────────────────────────────────────────────

  createTempTab: async () => {
    const rand = Math.random().toString(36).slice(2, 10);
    const tempId = `nanpad_temp_${Date.now()}_${rand}`;
    await saveTempFile(tempId, "");
    const tab: OpenTab = {
      id: tempId,
      label: `#Temp ${rand.slice(0, 8)}`,
      path: null,
      content: "",
      isTemp: true,
      isDirty: false,
      ext: "txt",
      isPinned: true,
    };
    set((state) => ({
      openTabs: [...state.openTabs, tab],
      activeTabId: tab.id,
      tabBaselineContent: { ...state.tabBaselineContent, [tab.id]: tab.content },
    }));
  },

  saveTempAsDisk: async (tabId, diskPath) => {
    const tab = get().openTabs.find((t) => t.id === tabId);
    if (!tab) return;
    await writeFile(diskPath, tab.content);
    await deleteTempFile(tabId);
    const name = diskPath.replace(/\\/g, "/").split("/").pop() ?? diskPath;
    const ext = getExt(name);
    set((state) => {
      const { [tabId]: _, ...rest } = state.tabBaselineContent;
      return {
        openTabs: state.openTabs.map((t) =>
          t.id === tabId
            ? { ...t, id: diskPath, label: name, path: diskPath, isTemp: false, isDirty: false, ext, isPinned: true }
            : t
        ),
        activeTabId: state.activeTabId === tabId ? diskPath : state.activeTabId,
        tabBaselineContent: { ...rest, [diskPath]: tab.content },
      };
    });
    await get().reloadTree();
  },

  saveTempWithDialog: async (tabId) => {
    const tab = get().openTabs.find((t) => t.id === tabId);
    if (!tab || !tab.isTemp) return;
    const defaultName = tab.label.replace(/^#Temp\s+/, "nota") + ".txt";
    const diskPath = await saveFileDialog(defaultName);
    if (!diskPath) return;
    await get().saveTempAsDisk(tabId, diskPath);
  },
}));
