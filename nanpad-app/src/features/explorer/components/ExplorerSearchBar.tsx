/**
 * ExplorerSearchBar — buscador del explorador de archivos (independiente del árbol).
 *
 * Sin texto + click → dropdown con árbol navegable. La ruta que se navega aquí
 * es local (browseRootPath) y no cambia la raíz del explorador; solo al hacer
 * doble click en una carpeta ("ir a carpeta") se actualiza la raíz del explorador.
 * Arriba del árbol se muestra un "árbol inverso" con hasta 4 carpetas padre para
 * saltar a un nivel superior sin sincronizar con el explorador.
 *
 * Con texto → búsqueda recursiva con debounce en la raíz del explorador (rootPath).
 *
 * Rendimiento: debounce 350ms, máximo MAX_RESULTS, profundidad MAX_DEPTH,
 * scroll al inicio al cambiar resultados.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { listDir } from "@/infrastructure/FsService.ts";
import { useExplorerStore } from "@/store/useExplorerStore.ts";
import { useSearchFocusStore } from "@/store/useSearchFocusStore.ts";
import type { FsNode } from "@/infrastructure/FsService.ts";
import {
  IconFolder,
  IconFolderOpen,
  IconChevron,
  IconSpinner,
  IconSearch,
  IconClose,
} from "@ui/icons/index.tsx";
import { isPreviewableExt } from "@ui/icons/fileIconByExt.tsx";
import { ExplorerFileIcon } from "@features/explorer/utils/explorerFileIcons.tsx";

// ── Constantes ────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 100;
const MAX_RESULTS = 40;
const MAX_DEPTH = 4;

const ANCESTORS_COUNT = 4;

/** Devuelve hasta las últimas N carpetas padre de path (más cercanas a la raíz). */
function getAncestorPaths(path: string, count: number): { path: string; name: string }[] {
  const normalized = path.replace(/\\/g, "/").replace(/\/$/, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) return [];
  const result: { path: string; name: string }[] = [];
  for (let i = 0; i < Math.min(count, parts.length - 1); i++) {
    const idx = parts.length - 1 - i;
    const p = parts.slice(0, idx).join("/");
    const name = parts[idx - 1] ?? p;
    result.push({ path: p || "/", name });
  }
  return result;
}

// ── Tipos para resultados en árbol ────────────────────────────────────────────

/**
 * Un directorio padre con sus archivos/dirs coincidentes como hijos directos.
 * Los coincidentes pueden ser files o subdirs que también matchean.
 */
interface SearchTreeNode {
  dir: FsNode;
  matches: FsNode[];
}

// ── Búsqueda recursiva → árbol agrupado ───────────────────────────────────────

/**
 * Recorre el FS y agrupa los resultados por directorio padre.
 * Devuelve un array de SearchTreeNode (directorio → hijos coincidentes).
 * Un directorio que coincide en nombre se incluye también como match.
 */
async function searchIntoTree(
  dirPath: string,
  dirNode: FsNode,
  query: string,
  depth: number,
  cancelled: { current: boolean },
  totalFound: { count: number }
): Promise<SearchTreeNode[]> {
  if (depth > MAX_DEPTH || totalFound.count >= MAX_RESULTS || cancelled.current) return [];

  let entries: FsNode[];
  try {
    entries = await listDir(dirPath);
  } catch {
    return [];
  }

  const directMatches: FsNode[] = [];
  const subGroups: SearchTreeNode[] = [];

  for (const entry of entries) {
    if (cancelled.current || totalFound.count >= MAX_RESULTS) break;

    if (entry.name.toLowerCase().includes(query)) {
      directMatches.push(entry);
      totalFound.count++;
    }

    // Aunque el dir no coincida en nombre, seguimos buscando dentro
    if (entry.isDir && depth < MAX_DEPTH) {
      const sub = await searchIntoTree(entry.path, entry, query, depth + 1, cancelled, totalFound);
      subGroups.push(...sub);
    }
  }

  const result: SearchTreeNode[] = [];

  // Grupo de este directorio solo si tiene coincidencias directas
  if (directMatches.length > 0) {
    result.push({ dir: dirNode, matches: directMatches });
  }

  // Subgrupos de subdirectorios
  result.push(...subGroups);

  return result;
}

// ── Icono de nodo ─────────────────────────────────────────────────────────────

function NodeIcon({ node, expanded = false }: { node: FsNode; expanded?: boolean }) {
  if (node.isDir) return expanded ? <IconFolderOpen size={13} /> : <IconFolder size={13} />;
  return <ExplorerFileIcon ext={node.ext} size={13} />;
}

function nodeColor(node: FsNode) {
  if (node.isDir) return "var(--color-priority-high)";
  if (isPreviewableExt(node.ext)) return "var(--color-priority-medium)";
  return "var(--color-text-muted)";
}

// ── Árbol navegable dentro del dropdown (modo sin texto) ─────────────────────

interface TreeItemProps {
  node: FsNode;
  depth: number;
  onSelectFile: (node: FsNode) => void;
  onSelectDir: (node: FsNode) => void;
}

function TreeItem({ node, depth, onSelectFile, onSelectDir }: TreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FsNode[] | null>(null);
  const [childCount, setChildCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Precargar el conteo de hijos para directorios
  useEffect(() => {
    if (!node.isDir) return;
    let alive = true;
    listDir(node.path)
      .then((kids) => { if (alive) setChildCount(kids.length); })
      .catch(() => { if (alive) setChildCount(0); });
    return () => { alive = false; };
  }, [node.path, node.isDir]);

  const handleClick = useCallback(async () => {
    if (!node.isDir) { onSelectFile(node); return; }
    if (expanded) { setExpanded(false); return; }
    setLoading(true);
    try {
      const kids = await listDir(node.path);
      setChildren(kids);
      setChildCount(kids.length);
      setExpanded(true);
    } catch {
      setChildren([]);
      setChildCount(0);
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  }, [node, expanded, onSelectFile]);

  return (
    <div>
      <div
        role="button"
        tabIndex={-1}
        onClick={() => void handleClick()}
        onDoubleClick={() => { if (node.isDir) onSelectDir(node); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 10px",
          paddingLeft: `${10 + depth * 14}px`,
          cursor: "pointer",
          borderRadius: "4px",
          fontSize: "13px",
          color: "var(--color-text-secondary)",
          transition: "background 0.08s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
          (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
        }}
      >
        {/* Chevron rotado si expandido */}
        <span style={{ width: 12, flexShrink: 0, color: "var(--color-text-muted)", opacity: node.isDir ? 1 : 0 }}>
          {node.isDir && (
            loading ? <IconSpinner size={10} /> : (
              <span style={{
                display: "inline-block",
                transform: expanded ? "rotate(90deg)" : "none",
                transition: "transform 0.15s ease",
              }}>
                <IconChevron size={10} />
              </span>
            )
          )}
        </span>

        {/* Icono */}
        <span style={{ flexShrink: 0, color: nodeColor(node) }}>
          <NodeIcon node={node} expanded={expanded} />
        </span>

        {/* Nombre */}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {node.name}
        </span>

        {/* Conteo de archivos para carpetas (hint semántico) */}
        {node.isDir && childCount !== null && (
          <span style={{ fontSize: "10px", color: "var(--color-text-muted)", opacity: 0.55, flexShrink: 0 }}>
            {childCount} {childCount === 1 ? "elemento" : "elementos"}
          </span>
        )}
      </div>

      {/* Hijos */}
      {expanded && children && (
        <div>
          {children.length === 0 ? (
            <div style={{
              paddingLeft: `${24 + (depth + 1) * 14}px`,
              fontSize: "12px",
              color: "var(--color-text-muted)",
              opacity: 0.4,
              padding: `3px 10px 3px ${24 + (depth + 1) * 14}px`,
            }}>
              vacío
            </div>
          ) : (
            children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                onSelectFile={onSelectFile}
                onSelectDir={onSelectDir}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Grupo de resultados en árbol (modo búsqueda) ──────────────────────────────

interface SearchGroupProps {
  group: SearchTreeNode;
  query: string;
  rootPath: string;
  onSelectFile: (node: FsNode) => void;
  onSelectDir: (node: FsNode) => void;
}

function SearchGroup({ group, query, rootPath, onSelectFile, onSelectDir }: SearchGroupProps) {
  // Ruta relativa del directorio padre
  const relPath = group.dir.path.replace(rootPath, "").replace(/^[\\/]/, "") || "/";

  return (
    <div style={{ marginBottom: "2px" }}>
      {/* Cabecera del grupo — directorio padre */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 12px 3px",
          fontSize: "11px",
          color: "var(--color-text-muted)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <span style={{ color: "var(--color-priority-high)", flexShrink: 0 }}>
          <IconFolderOpen size={11} />
        </span>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
          }}
          title={group.dir.path}
        >
          {relPath}
        </span>
      </div>

      {/* Hijos coincidentes con indentación */}
      {group.matches.map((node) => (
        <div
          key={node.path}
          role="button"
          tabIndex={-1}
          onClick={() => {
            if (node.isDir) onSelectDir(node);
            else onSelectFile(node);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 12px 5px 28px",
            cursor: "pointer",
            transition: "background 0.08s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <span style={{ flexShrink: 0, color: nodeColor(node) }}>
            <NodeIcon node={node} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <HighlightedName name={node.name} query={query} />
          </span>
          {node.isDir && (
            <span style={{ fontSize: "10px", color: "var(--color-text-muted)", opacity: 0.5, flexShrink: 0 }}>
              carpeta
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ExplorerSearchBar() {
  const { rootPath, tree, openFile, setRoot } = useExplorerStore();
  const setFocusExplorerSearch = useSearchFocusStore((s) => s.setFocusExplorerSearch);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [searchGroups, setSearchGroups] = useState<SearchTreeNode[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);

  /** Ruta que se muestra en el dropdown (árbol). Independiente del explorador: subir no llama setRoot. */
  const [browseRootPath, setBrowseRootPath] = useState(rootPath);
  /** Árbol cargado para browseRootPath cuando es distinto de rootPath. */
  const [dropdownTree, setDropdownTree] = useState<FsNode[] | null>(null);
  /** Si la sección "Carpetas anteriores" está desplegada (por defecto oculta). */
  const [ancestorsExpanded, setAncestorsExpanded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef({ current: false });

  // Registrar foco del buscador para Ctrl+U
  useEffect(() => {
    setFocusExplorerSearch(() => inputRef.current?.focus());
    return () => setFocusExplorerSearch(null);
  }, [setFocusExplorerSearch]);

  // Al abrir el dropdown, resetear la ruta de navegación a la raíz actual del explorador
  useEffect(() => {
    if (open) setBrowseRootPath(rootPath);
  }, [open, rootPath]);

  // Cargar árbol del dropdown cuando browseRootPath !== rootPath
  useEffect(() => {
    if (browseRootPath === rootPath) {
      setDropdownTree(null);
      return;
    }
    let alive = true;
    listDir(browseRootPath)
      .then((nodes) => { if (alive) setDropdownTree(nodes); })
      .catch(() => { if (alive) setDropdownTree([]); });
    return () => { alive = false; };
  }, [browseRootPath, rootPath]);

  /** Árbol a mostrar en modo navegación: store tree o dropdownTree. */
  const displayTree = browseRootPath === rootPath ? tree : (dropdownTree ?? []);

  // ── Búsqueda con debounce ────────────────────────────────────────────────

  useEffect(() => {
    if (!query.trim()) {
      setSearchGroups([]);
      setSearching(false);
      return;
    }

    // Cancelar búsqueda anterior
    cancelledRef.current.current = true;
    const newCancelled = { current: false };
    cancelledRef.current = newCancelled;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSearching(true);

    debounceTimer.current = setTimeout(async () => {
      const rootNode: FsNode = { name: rootPath.split(/[\\/]/).pop() ?? rootPath, path: rootPath, isDir: true };
      const totalFound = { count: 0 };
      const groups = await searchIntoTree(
        rootPath, rootNode, query.toLowerCase().trim(), 0, newCancelled, totalFound
      );
      if (!newCancelled.current) {
        setSearchGroups(groups);
        setSearching(false);
        // Scroll al inicio del dropdown al llegar nuevos resultados
        if (dropdownRef.current) dropdownRef.current.scrollTop = 0;
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, rootPath]);

  // ── Cerrar dropdown al click fuera ──────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleFocus = useCallback(() => {
    setFocused(true);
    setOpen(true);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
  }, []);

  const handleClear = useCallback(() => {
    setQuery("");
    setSearchGroups([]);
    inputRef.current?.focus();
  }, []);

  const handleSelectFile = useCallback((node: FsNode) => {
    void openFile(node);
    setOpen(false);
    setQuery("");
  }, [openFile]);

  /** Doble click en carpeta: sí actualiza el explorador y cierra el dropdown. */
  const handleSelectDir = useCallback((node: FsNode) => {
    void setRoot(node.path);
    setBrowseRootPath(node.path);
    setOpen(false);
    setQuery("");
  }, [setRoot]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  }, []);

  /** Ir a una carpeta padre en el dropdown (solo cambia browseRootPath; no toca el explorador). */
  const handleGoToAncestor = useCallback((path: string) => {
    setBrowseRootPath(path);
  }, []);

  // ── Derivados ────────────────────────────────────────────────────────────

  const isSearchMode = query.trim().length > 0;
  const totalMatches = searchGroups.reduce((acc, g) => acc + g.matches.length, 0);
  const hitLimit = totalMatches >= MAX_RESULTS;

  // Nombre legible de la raíz del explorador para el placeholder de búsqueda
  const rootName = rootPath.split(/[\\/]/).filter(Boolean).pop() ?? rootPath;

  // Hasta 4 carpetas padre de la ruta actual del dropdown (árbol inverso)
  const ancestorPaths = getAncestorPaths(browseRootPath, ANCESTORS_COUNT);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "300px", flexShrink: 0 }}
    >
      {/* Input */}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {/* Icono lupa / carpeta */}
        <span
          style={{
            position: "absolute",
            left: "10px",
            color: focused ? "var(--color-accent)" : "var(--color-text-muted)",
            pointerEvents: "none",
            transition: "color 0.15s ease",
            lineHeight: 0,
          }}
        >
          {isSearchMode ? (
            <IconSearch size={13} />
          ) : (
            <IconFolder size={13} />
          )}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={`Buscar en ${rootName}…`}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            height: "30px",
            paddingLeft: "30px",
            paddingRight: query ? "28px" : "10px",
            fontSize: "13px",
            background: focused ? "var(--color-surface)" : "var(--color-surface-2)",
            border: `1px solid ${focused ? "var(--color-accent)" : "var(--color-border)"}`,
            borderRadius: open ? "7px 7px 0 0" : "7px",
            color: "var(--color-text-primary)",
            outline: "none",
            transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
            boxShadow: focused ? "0 0 0 2px var(--color-accent-subtle)" : "none",
          }}
        />

        {query && (
          <button
            onClick={handleClear}
            title="Limpiar búsqueda"
            style={{
              position: "absolute",
              right: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              border: "none",
              background: "var(--color-surface-hover)",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              padding: 0,
              transition: "all 0.1s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--color-border-strong)";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
            }}
          >
            <IconClose size={8} />
          </button>
        )}
      </div>

      {/* Dropdown con animación de entrada */}
      {open && (
        <div
          ref={dropdownRef}
          className="dropdown-enter"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-accent)",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            boxShadow: "var(--shadow-xl)",
            zIndex: 200,
            maxHeight: "420px",
            overflowY: "auto",
            overflowX: "hidden",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >

          {/* ── HEADER: árbol inverso (hasta 4 carpetas padre) + ruta actual ─── */}
          <div
            style={{
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            {/* Opción para desplegar carpetas anteriores (solo si hay ancestros y no está expandido) */}
            {!isSearchMode && ancestorPaths.length > 0 && !ancestorsExpanded && (
              <div
                role="button"
                tabIndex={-1}
                onClick={() => setAncestorsExpanded(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                  transition: "background 0.08s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-accent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
                }}
              >
                <span style={{ flexShrink: 0, opacity: 0.8, display: "inline-block", transform: "rotate(-90deg)" }}>
                  <IconChevron size={10} />
                </span>
                <span>Ver carpetas anteriores</span>
              </div>
            )}

            {/* Filas de carpetas padre (solo visibles al desplegar) */}
            {!isSearchMode && ancestorPaths.length > 0 && ancestorsExpanded && (
              <div style={{ padding: "4px 0 2px" }}>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)", padding: "2px 10px 4px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Carpetas anteriores
                </div>
                {ancestorPaths.map((anc) => (
                  <div
                    key={anc.path}
                    role="button"
                    tabIndex={-1}
                    onClick={() => handleGoToAncestor(anc.path)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 10px",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: "var(--color-text-secondary)",
                      transition: "background 0.08s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
                      (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
                    }}
                    title={anc.path}
                  >
                    <span style={{ color: "var(--color-priority-high)", flexShrink: 0 }}>
                      <IconFolder size={12} />
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {anc.name}
                    </span>
                  </div>
                ))}
                <div
                  role="button"
                  tabIndex={-1}
                  onClick={() => setAncestorsExpanded(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 10px",
                    marginTop: "2px",
                    cursor: "pointer",
                    fontSize: "11px",
                    color: "var(--color-text-muted)",
                    borderTop: "1px solid var(--color-border)",
                    transition: "background 0.08s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
                  }}
                >
                  <span style={{ flexShrink: 0, display: "inline-block", transform: "rotate(90deg)" }}>
                    <IconChevron size={10} />
                  </span>
                  <span>Ocultar carpetas anteriores</span>
                </div>
              </div>
            )}

            {/* Ruta actual del dropdown + estado de búsqueda */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 10px",
                borderTop: (ancestorPaths.length > 0 && !isSearchMode) ? "1px solid var(--color-border)" : "none",
              }}
            >
              <span style={{ color: "var(--color-priority-high)", flexShrink: 0 }}>
                <IconFolderOpen size={12} />
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
                title={browseRootPath}
              >
                {browseRootPath}
              </span>
              {isSearchMode && (
                <span style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                  {searching ? (
                    <IconSpinner size={11} />
                  ) : (
                    <span style={{
                      fontSize: "10px",
                      background: hitLimit ? "oklch(0.769 0.188 70.08 / 15%)" : "var(--color-accent-subtle)",
                      color: hitLimit ? "var(--color-priority-medium)" : "var(--color-accent)",
                      borderRadius: "4px",
                      padding: "1px 5px",
                      fontWeight: 600,
                    }}>
                      {totalMatches}{hitLimit ? "+" : ""}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* ── MODO ÁRBOL (sin texto) ─── */}
          {!isSearchMode && (
            <div style={{ padding: "4px 0" }}>
              {displayTree.length === 0 ? (
                <div style={{ padding: "12px 14px", fontSize: "12px", color: "var(--color-text-muted)", opacity: 0.5 }}>
                  Carpeta vacía
                </div>
              ) : (
                displayTree.map((node) => (
                  <TreeItem
                    key={node.path}
                    node={node}
                    depth={0}
                    onSelectFile={handleSelectFile}
                    onSelectDir={handleSelectDir}
                  />
                ))
              )}
            </div>
          )}

          {/* ── MODO BÚSQUEDA (con texto) ─── */}
          {isSearchMode && !searching && (
            <>
              {searchGroups.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "var(--color-text-muted)", opacity: 0.6 }}>
                  Sin resultados para &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div style={{ padding: "4px 0 8px" }}>
                  {searchGroups.map((group) => (
                    <SearchGroup
                      key={group.dir.path}
                      group={group}
                      query={query}
                      rootPath={rootPath}
                      onSelectFile={handleSelectFile}
                      onSelectDir={handleSelectDir}
                    />
                  ))}
                  {hitLimit && (
                    <div style={{
                      padding: "6px 12px",
                      fontSize: "11px",
                      color: "var(--color-priority-medium)",
                      borderTop: "1px solid var(--color-border)",
                      marginTop: "4px",
                      opacity: 0.75,
                    }}>
                      Mostrando los primeros {MAX_RESULTS} resultados. Refiná la búsqueda para ver más.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Skeleton mientras busca */}
          {isSearchMode && searching && (
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {[80, 60, 70, 50].map((w, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center", opacity: 0.3 }}>
                  <div style={{ width: 13, height: 13, borderRadius: "3px", background: "var(--color-border-strong)" }} />
                  <div style={{ height: 12, width: `${w}%`, borderRadius: "4px", background: "var(--color-border-strong)" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Highlight de coincidencias ────────────────────────────────────────────────

function HighlightedName({ name, query }: { name: string; query: string }) {
  const lower = name.toLowerCase();
  const q = query.toLowerCase().trim();
  const idx = lower.indexOf(q);

  if (!q || idx < 0) {
    return <span style={{ fontSize: "13px", color: "var(--color-text-primary)" }}>{name}</span>;
  }

  return (
    <span style={{ fontSize: "13px", color: "var(--color-text-primary)" }}>
      {name.slice(0, idx)}
      <mark style={{
        background: "var(--color-accent-subtle)",
        color: "var(--color-accent)",
        borderRadius: "2px",
        padding: "0 1px",
        fontWeight: 600,
      }}>
        {name.slice(idx, idx + q.length)}
      </mark>
      {name.slice(idx + q.length)}
    </span>
  );
}
