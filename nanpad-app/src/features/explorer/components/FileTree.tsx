/**
 * FileTree — árbol de archivos y carpetas navegable.
 * - Click simple en archivo: abre en modo "preview" (tab no fijado, se reemplaza al cambiar).
 * - Doble click en archivo: fija el tab (permanece aunque se abran otros por single-click).
 * - Input inline de creación/renombrado aparece en su posición exacta en el árbol.
 * - Menú contextual con modal de confirmación custom para eliminación.
 */

import { useState, useCallback, useRef } from "react";
import type { FsNode } from "@/infrastructure/FsService.ts";
import { useExplorerStore } from "@/store/useExplorerStore.ts";
import { detectLanguage } from "@features/explorer/utils/langDetect.ts";
import { ContextMenu, type ContextMenuItem } from "@ui/components/ContextMenu.tsx";
import {
  IconFolder,
  IconFolderOpen,
  IconFolderNew,
  IconFileNew,
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
} from "@ui/icons/index.tsx";
import { canOpenInCode, isPreviewableExt } from "@ui/icons/fileIconByExt.tsx";
import { ExplorerFileIcon } from "@features/explorer/utils/explorerFileIcons.tsx";

function canPreview(ext?: string): boolean {
  return isPreviewableExt(ext);
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
 */
function ConfirmDialog({ message, confirmLabel = "Eliminar", onConfirm, onCancel }: ConfirmDialogProps) {
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
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border-strong)",
          borderRadius: "10px",
          padding: "24px 28px",
          minWidth: "320px",
          maxWidth: "420px",
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
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

/**
 * Input inline que aparece en su posición exacta dentro del árbol.
 * Se selecciona el texto antes de la extensión para renombrado rápido.
 */
function InlineInput({ defaultValue = "nuevo archivo.txt", depth, onConfirm, onCancel }: InlineInputProps) {
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

function TreeNode({ node, depth, onContextMenu, inlineChild, onInlineConfirm, onInlineCancel, focusedPath, onFocus, onBlur, onRequestRename, onRequestDelete }: TreeNodeProps) {
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

  const handleClick = useCallback(() => {
    if (node.isDir) {
      if (isExpanded) collapseDir(node.path);
      else {
        setExpanding(true);
        void expandDir(node.path).then(() => setExpanding(false));
      }
      return;
    }
    // Single click en archivo: preview (con debounce para distinguir del doble click)
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      void previewFile(node);
    }, 200);
  }, [node, isExpanded, previewFile, expandDir, collapseDir]);

  const handleDoubleClick = useCallback(() => {
    if (node.isDir) return;
    // Cancelar el single click pendiente
    if (clickTimer.current) clearTimeout(clickTimer.current);
    // Doble click: abrir/fijar el tab
    void openFile(node);
  }, [node, openFile]);

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
              handleClick();
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
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, node); }}
          title={isOpen && !isPinned ? `${node.name} (vista previa — doble click para fijar)` : node.path}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 8px 3px 0",
            paddingLeft: `${indent + 8}px`,
            cursor: "pointer",
            borderRadius: "4px",
            background: showActiveStyle ? "var(--color-surface-hover)" : "transparent",
            color: showActiveStyle ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            userSelect: "none",
            fontSize: "13px",
            transition: "background 0.1s ease, color 0.1s ease",
            fontWeight: showActiveStyle ? 500 : 400,
            outline: "none",
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
              style={{
                paddingLeft: `${(depth + 1) * 14 + 22}px`,
                fontSize: "12px",
                color: "var(--color-text-muted)",
                opacity: 0.45,
                paddingTop: "2px",
                paddingBottom: "2px",
              }}
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

/**
 * Árbol de archivos navegable con menú contextual completo.
 */
export function FileTree({ onOpenFolderDialog }: FileTreeProps) {
  const { tree, loadingTree, reloadTree, createNewFile, createNewDir, deleteNode, renameNode, openFile } =
    useExplorerStore();
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);
  const [inlineAction, setInlineAction] = useState<InlineAction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FsNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const buildMenuItems = useCallback((node: FsNode): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (node.isDir) {
      items.push(
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
  }, [openFile]);

  const handleInlineConfirm = useCallback(async (name: string) => {
    if (!inlineAction) return;
    setInlineAction(null);
    if (inlineAction.type === "new-file") {
      await createNewFile(inlineAction.parentPath, name);
    } else if (inlineAction.type === "new-dir") {
      await createNewDir(inlineAction.parentPath, name);
    } else if (inlineAction.type === "rename") {
      await renameNode(inlineAction.node, name);
    }
  }, [inlineAction, createNewFile, createNewDir, renameNode]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--color-surface-2)",
        borderRight: "1px solid var(--color-border)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--color-text-muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Explorador
        </span>
        <div style={{ display: "flex", gap: "2px" }}>
          <button title="Recargar árbol" onClick={() => void reloadTree()} style={iconBtnStyle}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
          >
            <IconRefresh size={12} />
          </button>
          <button title="Cambiar carpeta raíz" onClick={onOpenFolderDialog} style={iconBtnStyle}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
          >
            <IconFolder size={12} />
          </button>
        </div>
      </div>

      {/* Árbol */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {loadingTree ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
            <IconSpinner size={16} />
          </div>
        ) : tree.length === 0 ? (
          <div
            style={{
              padding: "20px 12px",
              textAlign: "center",
              fontSize: "12px",
              color: "var(--color-text-muted)",
              opacity: 0.6,
            }}
          >
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
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "22px",
  height: "22px",
  borderRadius: "4px",
  border: "none",
  background: "transparent",
  color: "var(--color-text-muted)",
  cursor: "pointer",
  transition: "background 0.1s ease, color 0.1s ease",
};
