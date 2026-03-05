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

  // ── Inicialización ─────────────────────────────────────────────────────────
  /** Inicializa raíz y temporales. Idempotente: si ya inicializó, no hace nada. */
  init: (metas: TempFileMeta[], homeDir: string) => Promise<void>;
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

  // ── Inicialización ────────────────────────────────────────────────────────

  init: async (metas, homeDir) => {
    if (get().initialized) return;

    // Determinar raíz
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

    set({
      tree,
      loadingTree: false,
      openTabs: tempTabs,
      activeTabId: tempTabs[0]?.id ?? null,
      initialized: true,
    });
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
      }));
    } else {
      set((state) => ({
        openTabs: [...state.openTabs, tab],
        activeTabId: tab.id,
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
      }));
    } else {
      set((state) => ({
        openTabs: [...state.openTabs, tab],
        activeTabId: tab.id,
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

  closeTab: async (id) => {
    const tab = get().openTabs.find((t) => t.id === id);
    if (!tab) return;

    // Si es temporal, eliminar el archivo físico antes de remover del estado
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
      return { openTabs: tabs, activeTabId: active };
    });
  },

  updateTabContent: (id, content) => {
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.id === id ? { ...t, content, isDirty: true } : t
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
    }));
  },

  // ── Temporales ────────────────────────────────────────────────────────────

  createTempTab: async () => {
    // Generar ID manual (sin depender de createNewTempFile que usa timestamp)
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
    }));
  },

  saveTempAsDisk: async (tabId, diskPath) => {
    const tab = get().openTabs.find((t) => t.id === tabId);
    if (!tab) return;
    await writeFile(diskPath, tab.content);
    await deleteTempFile(tabId);
    const name = diskPath.replace(/\\/g, "/").split("/").pop() ?? diskPath;
    const ext = getExt(name);
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.id === tabId
          ? { ...t, id: diskPath, label: name, path: diskPath, isTemp: false, isDirty: false, ext, isPinned: true }
          : t
      ),
      activeTabId: state.activeTabId === tabId ? diskPath : state.activeTabId,
    }));
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
