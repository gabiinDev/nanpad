/**
 * FileTree — árbol de archivos y carpetas navegable.
 * - Click simple en archivo: abre en modo "preview" (tab no fijado, se reemplaza al cambiar).
 * - Doble click en archivo: fija el tab (permanece aunque se abran otros por single-click).
 * - Input inline de creación/renombrado aparece en su posición exacta en el árbol.
 * - Menú contextual con modal de confirmación custom para eliminación.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { FsNode } from "@/infrastructure/FsService.ts";
import { useExplorerStore } from "@/store/useExplorerStore.ts";
import { detectLanguage } from "@features/explorer/utils/langDetect.ts";
import { ContextMenu, type ContextMenuItem } from "@ui/components/ContextMenu.tsx";
import {
  IconFolder,
  IconFolderOpen,
  IconFolderNew,
  IconFileNew,
  IconStar,
  IconFileText,
  IconDelete,
  IconEdit,
  IconChevron,
  IconChevronDown,
  IconRefresh,
  IconSpinner,
  IconEditorMode,
  IconSplitMode,
  IconPreviewMode,
  IconClose,
} from "@ui/icons/index.tsx";
import { canOpenInCode, isPreviewableExt, isNonEditableExt } from "@ui/icons/fileIconByExt.tsx";
import { ExplorerFileIcon } from "@features/explorer/utils/explorerFileIcons.tsx";
import { validateFileNameOrPath, validateSingleName } from "@features/explorer/utils/validateFileName.ts";
import { useToastStore } from "@/store/useToastStore.ts";

function canPreview(ext?: string): boolean {
  return isPreviewableExt(ext);
}

/** Comprueba si el archivo se puede abrir/editar (no es zip, exe, audio, imagen, etc.). */
function isFileOpenable(ext?: string): boolean {
  if (isNonEditableExt(ext)) return false;
  const n = (ext ?? "").replace(/^\./, "").toLowerCase();
  return canOpenInCode(ext) || n === "";
}

/** Panel de favoritos colapsable, badges con X para quitar. */
function FavoritesPanel({
  favoriteFolders,
  expanded,
  onToggle,
  setRoot,
  removeFavoriteFolder,
}: {
  favoriteFolders: string[];
  expanded: boolean;
  onToggle: () => void;
  setRoot: (path: string) => Promise<void>;
  removeFavoriteFolder: (path: string) => void;
}) {
  return (
    <div className="shrink-0 border-b border-[var(--color-border)] px-2.5 py-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-1.5 text-left"
        title={expanded ? "Contraer favoritos" : "Expandir favoritos"}
      >
        <span className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          <IconStar size={10} className="shrink-0 text-[var(--color-accent)]" />
          Favoritos ({favoriteFolders.length})
        </span>
        <span className="shrink-0 text-[var(--color-text-muted)]" style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
          <IconChevronDown size={10} />
        </span>
      </button>
      {expanded && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {favoriteFolders.map((path) => {
            const name = path.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? path;
            return (
              <span
                key={path}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[0.6875rem] text-[var(--color-text-secondary)]"
              >
                <button
                  type="button"
                  onClick={() => void setRoot(path)}
                  title={path}
                  className="min-w-0 truncate text-left hover:text-[var(--color-text-primary)]"
                >
                  {name}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFavoriteFolder(path); }}
                  title="Quitar de favoritos"
                  className="shrink-0 rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-priority-high)]/15 hover:text-[var(--color-priority-high)]"
                >
                  <IconClose size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Modal de confirmación (reutilizado de TabBar) ─────────────────────────────

interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal de confirmación de dos opciones (Confirmar / Cancelar).
 * Al abrir se hace foco en Cancelar para que el usuario pueda navegar con teclado y Enter no confirme por defecto.
 */
function ConfirmDialog({ message, confirmLabel = "Eliminar", onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / 55%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border-strong)",
          borderRadius: "10px",
          padding: "24px 28px",
          minWidth: "min(320px, 100%)",
          maxWidth: "min(420px, calc(100vw - 2rem))",
          maxHeight: "calc(100vh - 4rem)",
          overflowY: "auto",
          boxShadow: "var(--shadow-xl)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: "15px", color: "var(--color-text-primary)", lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            style={{
              padding: "7px 16px", borderRadius: "6px",
              border: "1px solid var(--color-border)", background: "transparent",
              color: "var(--color-text-secondary)", fontSize: "13px", cursor: "pointer",
              transition: "all 0.1s ease",
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
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "7px 16px", borderRadius: "6px",
              border: "1px solid oklch(0.704 0.191 22.216 / 40%)",
              background: "oklch(0.704 0.191 22.216 / 12%)",
              color: "var(--color-priority-critical)", fontSize: "13px",
              fontWeight: 500, cursor: "pointer",
              transition: "all 0.1s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "oklch(0.704 0.191 22.216 / 22%)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "oklch(0.704 0.191 22.216 / 12%)";
            }}
          >
            <span style={{ marginRight: 5 }}><IconDelete size={12} /></span>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Evento para cambiar modo de vista desde FileTree ──────────────────────────

function openWithMode(
  openFile: (node: FsNode) => Promise<void>,
  node: FsNode,
  mode: "editor" | "split" | "preview"
) {
  void openFile(node).then(() => {
    window.dispatchEvent(
      new CustomEvent("nanpad:set-editor-mode", { detail: { tabId: node.path, mode } })
    );
  });
}

// ── Input inline para crear/renombrar ─────────────────────────────────────────

interface InlineInputProps {
  defaultValue?: string;
  depth: number;
  placeholder?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

/**
 * Input inline que aparece en su posición exacta dentro del árbol.
 * Se selecciona el texto antes de la extensión para renombrado rápido.
 */
function InlineInput({ defaultValue = "nuevo archivo.txt", depth, placeholder, onConfirm, onCancel }: InlineInputProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const indent = depth * 14;

  // Al montar, seleccionar solo el nombre (sin extensión) para facilitar el renombrado
  const handleMount = useCallback((el: HTMLInputElement | null) => {
    if (!el) return;
    (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    el.focus();
    const dotIdx = defaultValue.lastIndexOf(".");
    if (dotIdx > 0) {
      el.setSelectionRange(0, dotIdx);
    } else {
      el.select();
    }
  }, [defaultValue]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "2px 8px 2px 0",
        paddingLeft: `${indent + 8 + 17}px`, // alineado con nombre de archivo
      }}
    >
      <span style={{ flexShrink: 0, color: "var(--color-text-muted)" }}>
        <IconFileNew size={13} />
      </span>
      <input
        ref={handleMount}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
          if (e.key === "Escape") onCancel();
          e.stopPropagation();
        }}
        onBlur={() => {
          // Confirmar al perder el foco solo si hay valor
          if (value.trim()) onConfirm(value.trim());
          else onCancel();
        }}
        style={{
          flex: 1,
          background: "var(--color-surface)",
          border: "1px solid var(--color-accent)",
          borderRadius: "4px",
          padding: "2px 6px",
          fontSize: "13px",
          color: "var(--color-text-primary)",
          outline: "none",
          minWidth: 0,
        }}
      />
    </div>
  );
}

// ── Nodo del árbol ─────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: FsNode;
  depth: number;
  onContextMenu: (e: React.MouseEvent, node: FsNode) => void;
  favoriteFolders?: string[];
  addFavoriteFolder?: (path: string) => void;
  removeFavoriteFolder?: (path: string) => void;
  /** Si hay un inline action pendiente para este directorio, se pasa aquí para renderizarlo. */
  inlineChild?: InlineAction | null;
  onInlineConfirm: (name: string) => void;
  onInlineCancel: () => void;
  /** Ruta del nodo que tiene el foco de teclado (mismo estilo que activo). */
  focusedPath?: string | null;
  onFocus?: (path: string) => void;
  onBlur?: () => void;
  onRequestRename?: (node: FsNode) => void;
  onRequestDelete?: (node: FsNode) => void;
}

function TreeNode({ node, depth, onContextMenu, inlineChild, onInlineConfirm, onInlineCancel, focusedPath, onFocus, onBlur, onRequestRename, onRequestDelete, favoriteFolders, addFavoriteFolder, removeFavoriteFolder }: TreeNodeProps) {
  const { previewFile, openFile, pinTab, expandDir, collapseDir, openTabs, activeTabId } = useExplorerStore();
  const [expanding, setExpanding] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExpanded = node.isDir && Array.isArray(node.children);
  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const isActive = !node.isDir && activeTab?.path === node.path;
  const isFocused = focusedPath === node.path;
  const isOpen = !node.isDir && openTabs.some((t) => t.path === node.path);
  const isPinned = !node.isDir && openTabs.some((t) => t.path === node.path && t.isPinned);
  const showActiveStyle = isActive || isFocused;

  const openable = !node.isDir && isFileOpenable(node.ext);

  const handleClick = useCallback(
    (e?: React.MouseEvent) => {
      if (e) (e.currentTarget as HTMLElement).focus();
      if (node.isDir) {
        if (isExpanded) collapseDir(node.path);
        else {
          setExpanding(true);
          void expandDir(node.path).then(() => setExpanding(false));
        }
        return;
      }
      if (!openable) return;
      // Single click en archivo: preview (con debounce para distinguir del doble click)
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => {
        void previewFile(node);
      }, 200);
    },
    [node, isExpanded, openable, previewFile, expandDir, collapseDir]
  );

  const handleDoubleClick = useCallback(() => {
    if (node.isDir || !openable) return;
    // Cancelar el single click pendiente
    if (clickTimer.current) clearTimeout(clickTimer.current);
    // Doble click: abrir/fijar el tab
    void openFile(node);
  }, [node, openable, openFile]);

  // Fijar el tab al hacer doble click también sobre la pestaña activa en preview
  const handlePinClick = useCallback(() => {
    if (!node.isDir) pinTab(node.path);
  }, [node, pinTab]);

  const indent = depth * 14;

  // Determinar si hay inline action de renombrar para este nodo
  const isRenaming = inlineChild?.type === "rename" && inlineChild.node.path === node.path;

  return (
    <div>
      {isRenaming ? (
        // Modo renombrar: reemplaza la fila del nodo con el input
        <InlineInput
          defaultValue={node.name}
          depth={depth}
          onConfirm={onInlineConfirm}
          onCancel={onInlineCancel}
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          onFocus={() => onFocus?.(node.path)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleClick(undefined);
              return;
            }
            if (e.key === "F2") {
              e.preventDefault();
              onRequestRename?.(node);
              return;
            }
            if (e.key === "Delete") {
              e.preventDefault();
              onRequestDelete?.(node);
              return;
            }
          }}
          onClick={(e) => handleClick(e as React.MouseEvent)}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, node); }}
          title={!node.isDir && !openable ? `${node.name} (no editable)` : isOpen && !isPinned ? `${node.name} (vista previa — doble click para fijar)` : node.path}
          className="group flex min-h-[2.75rem] cursor-pointer select-none items-center gap-1.5 rounded-md text-[0.8125rem] outline-none transition-colors duration-150"
          style={{
            paddingLeft: `${indent + 8}px`,
            paddingRight: "0.5rem",
            paddingTop: "0.1875rem",
            paddingBottom: "0.1875rem",
            background: showActiveStyle ? "var(--color-surface-hover)" : "transparent",
            color: showActiveStyle ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            fontWeight: showActiveStyle ? 500 : 400,
            opacity: !node.isDir && !openable ? 0.6 : 1,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            if (!showActiveStyle) (e.currentTarget as HTMLElement).style.background = "color-mix(in oklch, var(--color-surface-hover) 60%, transparent)";
          }}
          onMouseLeave={(e) => {
            if (!showActiveStyle) (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {/* Chevron para directorios */}
          <span style={{ width: 12, flexShrink: 0, opacity: node.isDir ? 1 : 0, pointerEvents: "none" }}>
            {node.isDir && (
              expanding ? <IconSpinner size={10} />
                : isExpanded ? <IconChevronDown size={10} />
                  : <IconChevron size={10} />
            )}
          </span>

          {/* Icono */}
          <span
            style={{
              flexShrink: 0,
              color: node.isDir
                ? "var(--color-priority-high)"
                : isPreviewableExt(node.ext)
                  ? "var(--color-priority-medium)"
                  : "var(--color-text-muted)",
            }}
          >
            {node.isDir
              ? isExpanded ? <IconFolderOpen size={13} /> : <IconFolder size={13} />
              : <ExplorerFileIcon ext={node.ext} size={13} />
            }
          </span>

          {/* Nombre — itálica si está en preview sin fijar */}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              fontStyle: isOpen && !isPinned ? "italic" : "normal",
              opacity: isOpen && !isPinned ? 0.8 : 1,
            }}
            onDoubleClick={handlePinClick}
          >
            {node.name}
          </span>

          {/* Icono favorito en carpetas: visible siempre si es favorito, al hover si no */}
          {node.isDir && addFavoriteFolder && removeFavoriteFolder && favoriteFolders && (
            <span
              className={`ml-auto flex shrink-0 ${(() => {
                const norm = node.path.replace(/\\/g, "/").replace(/\/$/, "") || node.path;
                return favoriteFolders.includes(norm) ? "opacity-100" : "opacity-0 group-hover:opacity-100";
              })()}`}
              style={{ transition: "opacity 0.15s" }}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            >
              {(() => {
                const norm = node.path.replace(/\\/g, "/").replace(/\/$/, "") || node.path;
                const isFav = favoriteFolders.includes(norm);
                return (
                  <button
                    type="button"
                    title={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); isFav ? removeFavoriteFolder(node.path) : addFavoriteFolder(node.path); }}
                    className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-active)] hover:text-[var(--color-accent)]"
                    style={{ color: isFav ? "var(--color-accent)" : undefined }}
                  >
                    <IconStar size={12} />
                  </button>
                );
              })()}
            </span>
          )}

          {/* Indicador de archivo abierto y fijado */}
          {isOpen && !isActive && isPinned && (
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-accent)", flexShrink: 0, opacity: 0.6 }} />
          )}
        </div>
      )}

      {/* Hijos del directorio */}
      {isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onContextMenu={onContextMenu}
              inlineChild={inlineChild}
              onInlineConfirm={onInlineConfirm}
              onInlineCancel={onInlineCancel}
              focusedPath={focusedPath}
              onFocus={onFocus}
              onBlur={onBlur}
              onRequestRename={onRequestRename}
              onRequestDelete={onRequestDelete}
              favoriteFolders={favoriteFolders}
              addFavoriteFolder={addFavoriteFolder}
              removeFavoriteFolder={removeFavoriteFolder}
            />
          ))}

          {/* Input inline para nuevo archivo/carpeta dentro de este directorio */}
          {inlineChild && inlineChild.type !== "rename" && inlineChild.parentPath === node.path && (
            <InlineInput
              defaultValue={inlineChild.type === "new-dir" ? "nueva carpeta" : "nuevo archivo.txt"}
              depth={depth + 1}
              onConfirm={onInlineConfirm}
              onCancel={onInlineCancel}
            />
          )}

          {node.children.length === 0 && !(inlineChild && inlineChild.type !== "rename" && inlineChild.parentPath === node.path) && (
            <div
              className="py-0.5 text-xs text-[var(--color-text-muted)] opacity-45"
              style={{ paddingLeft: `${(depth + 1) * 14 + 22}px` }}
            >
              vacío
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── FileTree principal ─────────────────────────────────────────────────────────

interface FileTreeProps {
  onOpenFolderDialog: () => void;
}

interface ContextState { x: number; y: number; node: FsNode; }
type InlineAction =
  | { type: "new-file"; parentPath: string }
  | { type: "new-dir"; parentPath: string }
  | { type: "rename"; node: FsNode };

interface DeleteConfirm { node: FsNode; }
interface RenameConfirm { node: FsNode; newName: string; }

/**
 * Árbol de archivos navegable con menú contextual completo.
 */
export function FileTree({ onOpenFolderDialog }: FileTreeProps) {
  const { tree, loadingTree, reloadTree, createNewFile, createNewDir, deleteNode, renameNode, openFile, favoriteFolders, favoritesPanelExpanded, setFavoritesPanelExpanded, addFavoriteFolder, removeFavoriteFolder, setRoot, rootPath } =
    useExplorerStore();
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);
  const [inlineAction, setInlineAction] = useState<InlineAction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [renameConfirm, setRenameConfirm] = useState<RenameConfirm | null>(null);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FsNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const buildMenuItems = useCallback((node: FsNode): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (node.isDir) {
      const isFav = favoriteFolders.includes(node.path.replace(/\\/g, "/").replace(/\/$/, "") || node.path);
      items.push(
        {
          label: isFav ? "Quitar de favoritos" : "Agregar a favoritos",
          faIcon: <IconStar size={13} />,
          onClick: () => (isFav ? removeFavoriteFolder(node.path) : addFavoriteFolder(node.path)),
        },
        {
          label: "Nuevo archivo",
          faIcon: <IconFileNew size={13} />,
          onClick: () => setInlineAction({ type: "new-file", parentPath: node.path }),
        },
        {
          label: "Nueva carpeta",
          faIcon: <IconFolderNew size={13} />,
          onClick: () => setInlineAction({ type: "new-dir", parentPath: node.path }),
          separator: true,
        }
      );
    } else {
      const openable = isFileOpenable(node.ext);
      if (openable) {
        const lang = detectLanguage(node.ext);
        const hasSyntax = lang !== "plaintext" || canOpenInCode(node.ext);
        const hasPreview = canPreview(node.ext);

        items.push({
          label: "Abrir",
          faIcon: <IconFileText size={13} />,
          onClick: () => void openFile(node),
        });

        if (hasSyntax) {
          items.push({
            label: "Abrir en modo código",
            faIcon: <IconEditorMode size={13} />,
            onClick: () => openWithMode(openFile, node, "editor"),
          });
        }

        if (hasPreview) {
          items.push({
            label: "Vista dividida",
            faIcon: <IconSplitMode size={13} />,
            onClick: () => openWithMode(openFile, node, "split"),
          });
          items.push({
            label: "Vista previa",
            faIcon: <IconPreviewMode size={13} />,
            onClick: () => openWithMode(openFile, node, "preview"),
            separator: true,
          });
        } else {
          items[items.length - 1] = { ...items[items.length - 1], separator: true };
        }
      }
    }

    items.push(
      {
        label: "Renombrar",
        faIcon: <IconEdit size={13} />,
        onClick: () => setInlineAction({ type: "rename", node }),
      },
      {
        label: "Eliminar",
        faIcon: <IconDelete size={13} />,
        danger: true,
        onClick: () => setDeleteConfirm({ node }),
      }
    );

    return items;
  }, [openFile, favoriteFolders, addFavoriteFolder, removeFavoriteFolder]);

  const handleInlineConfirm = useCallback(async (name: string) => {
    if (!inlineAction) return;
    if (inlineAction.type === "rename") {
      const v = validateSingleName(name);
      if (!v.valid) {
        useToastStore.getState().toast(v.error ?? "Nombre no válido", "danger");
        return;
      }
      setRenameConfirm({ node: inlineAction.node, newName: name });
      setInlineAction(null);
      return;
    }
    if (inlineAction.type === "new-file") {
      const v = validateFileNameOrPath(name, false);
      if (!v.valid) {
        useToastStore.getState().toast(v.error ?? "Nombre no válido", "danger");
        return;
      }
    } else if (inlineAction.type === "new-dir") {
      const v = validateFileNameOrPath(name, true);
      if (!v.valid) {
        useToastStore.getState().toast(v.error ?? "Nombre no válido", "danger");
        return;
      }
    }
    setInlineAction(null);
    if (inlineAction.type === "new-file") {
      await createNewFile(inlineAction.parentPath, name);
    } else if (inlineAction.type === "new-dir") {
      await createNewDir(inlineAction.parentPath, name);
    }
  }, [inlineAction, createNewFile, createNewDir]);

  const handleRenameConfirm = useCallback(() => {
    if (!renameConfirm) return;
    const { node, newName } = renameConfirm;
    setRenameConfirm(null);
    void renameNode(node, newName);
  }, [renameConfirm, renameNode]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface-2)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-2.5 py-2">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Explorador
        </span>
        <div className="flex gap-0.5">
          <button
            type="button"
            title="Recargar árbol"
            onClick={() => void reloadTree()}
            className={iconBtnClass}
          >
            <IconRefresh size={12} />
          </button>
          <button
            type="button"
            title="Cambiar carpeta raíz"
            onClick={onOpenFolderDialog}
            className={iconBtnClass}
          >
            <IconFolder size={12} />
          </button>
        </div>
      </div>

      {/* Favoritos: badges colapsables con X para quitar */}
      {favoriteFolders.length > 0 && (
        <FavoritesPanel
          favoriteFolders={favoriteFolders}
          expanded={favoritesPanelExpanded}
          onToggle={() => setFavoritesPanelExpanded(!favoritesPanelExpanded)}
          setRoot={setRoot}
          removeFavoriteFolder={removeFavoriteFolder}
        />
      )}

      {/* Nombre de la carpeta raíz actual + crear en raíz */}
      {rootPath && (
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2"
          title={rootPath}
        >
          <span className="min-w-0 truncate text-[0.75rem] font-medium text-[var(--color-text-secondary)]">
            {rootPath.split(/[\\/]/).filter(Boolean).pop() ?? rootPath}
          </span>
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              title="Nuevo archivo en la raíz"
              onClick={() => setInlineAction({ type: "new-file", parentPath: rootPath })}
              className={iconBtnClass}
            >
              <IconFileNew size={12} />
            </button>
            <button
              type="button"
              title="Nueva carpeta en la raíz"
              onClick={() => setInlineAction({ type: "new-dir", parentPath: rootPath })}
              className={iconBtnClass}
            >
              <IconFolderNew size={12} />
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {/* Input inline para nuevo archivo/carpeta en la raíz */}
        {rootPath && inlineAction && inlineAction.type !== "rename" && inlineAction.parentPath === rootPath && (
          <InlineInput
            defaultValue={inlineAction.type === "new-dir" ? "nueva carpeta" : "nuevo archivo.txt"}
            depth={0}
            placeholder={inlineAction.type === "new-dir" ? "ej. nueva carpeta o ruta/subcarpeta" : "ej. archivo.txt o ruta/archivo.txt"}
            onConfirm={(name) => void handleInlineConfirm(name)}
            onCancel={() => setInlineAction(null)}
          />
        )}
        {loadingTree ? (
          <div className="flex justify-center py-5">
            <IconSpinner size={16} />
          </div>
        ) : tree.length === 0 ? (
          <div className="px-3 py-5 text-center text-xs text-[var(--color-text-muted)] opacity-60">
            Carpeta vacía
          </div>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              onContextMenu={handleContextMenu}
              inlineChild={inlineAction}
              onInlineConfirm={(name) => void handleInlineConfirm(name)}
              onInlineCancel={() => setInlineAction(null)}
              focusedPath={focusedPath}
              onFocus={setFocusedPath}
              onBlur={() => setFocusedPath(null)}
              onRequestRename={(n) => setInlineAction({ type: "rename", node: n })}
              onRequestDelete={(n) => setDeleteConfirm({ node: n })}
              favoriteFolders={favoriteFolders}
              addFavoriteFolder={addFavoriteFolder}
              removeFavoriteFolder={removeFavoriteFolder}
            />
          ))
        )}
      </div>

      {/* Menú contextual */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildMenuItems(contextMenu.node)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Modal de confirmación para eliminar */}
      {deleteConfirm && (
        <ConfirmDialog
          message={
            deleteConfirm.node.isDir
              ? `¿Eliminar la carpeta "${deleteConfirm.node.name}" y todo su contenido?`
              : `¿Eliminar "${deleteConfirm.node.name}"?`
          }
          confirmLabel="Eliminar"
          onConfirm={() => {
            const node = deleteConfirm.node;
            setDeleteConfirm(null);
            void deleteNode(node);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Modal de confirmación para renombrar */}
      {renameConfirm && (
        <ConfirmDialog
          message={`¿Renombrar "${renameConfirm.node.name}" a "${renameConfirm.newName}"?`}
          confirmLabel="Renombrar"
          onConfirm={handleRenameConfirm}
          onCancel={() => setRenameConfirm(null)}
        />
      )}
    </div>
  );
}

/** Botones del header del FileTree: área táctil mínima 44px */
const iconBtnClass =
  "flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-md border-none bg-transparent text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]";
