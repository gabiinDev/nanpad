/**
 * Vista de lista de tareas — estilo "code editor".
 * Números de línea monoespaciados a la izquierda, hover con glow de acento,
 * indicador de prioridad como punto luminoso.
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TaskDTO } from "@nanpad/core";
import { useNavFocusStore } from "@/store/useNavFocusStore.ts";
import { StatusBadge, PriorityBadge } from "@ui/components/Badge.tsx";
import { ContextMenu, type ContextMenuItem } from "@ui/components/ContextMenu.tsx";
import { IconCheck, IconProgress, IconArchive, IconRestore, IconEdit, IconPlus, IconClock } from "@ui/icons/index.tsx";

interface TaskListViewProps {
  tasks: TaskDTO[];
  onEdit: (task: TaskDTO) => void;
  onComplete: (id: string) => void;
  onRestore: (id: string) => void;
  onMoveStatus: (id: string, status: TaskDTO["status"]) => void;
  /** Al hacer click derecho en el contenedor (fuera de una tarea). */
  onAddTask?: () => void;
  /** Abrir modal de historial de la tarea. */
  onShowHistory?: (task: TaskDTO) => void;
}

interface ContextState { x: number; y: number; task: TaskDTO; }
interface EmptyContextState { x: number; y: number; }

const PRIORITY_GLOW: Record<number, string> = {
  0: "oklch(0.551 0.027 264.364 / 80%)",
  1: "oklch(0.696 0.17 162.48 / 80%)",
  2: "oklch(0.769 0.188 70.08 / 90%)",
  3: "oklch(0.704 0.191 22.216 / 90%)",
};
const PRIORITY_COLOR: Record<number, string> = {
  0: "var(--color-priority-low)",
  1: "var(--color-priority-medium)",
  2: "var(--color-priority-high)",
  3: "var(--color-priority-critical)",
};

/**
 * Lista virtualizada de tareas con estética de editor de código.
 */
export function TaskListView({ tasks, onEdit, onComplete, onRestore, onMoveStatus, onAddTask, onShowHistory }: TaskListViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);
  const [emptyContextMenu, setEmptyContextMenu] = useState<EmptyContextState | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const focusTaskId = useNavFocusStore((s) => s.focusTaskId);
  const setFocusTaskId = useNavFocusStore((s) => s.setFocusTaskId);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 58,
    overscan: 10,
  });

  useEffect(() => {
    if (!focusTaskId) return;
    const index = tasks.findIndex((t) => t.id === focusTaskId);
    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: "start", behavior: "smooth" });
      setFocusTaskId(null);
    } else if (tasks.length > 0) {
      setFocusTaskId(null);
    }
  }, [focusTaskId, tasks, virtualizer, setFocusTaskId]);

  const handleContextMenu = useCallback((e: React.MouseEvent, task: TaskDTO) => {
    e.preventDefault();
    e.stopPropagation();
    setEmptyContextMenu(null);
    setContextMenu({ x: e.clientX, y: e.clientY, task });
  }, []);

  const handleEmptyAreaContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null);
    setEmptyContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const buildMenuItems = useCallback((task: TaskDTO): ContextMenuItem[] => {
    const { status } = task;
    const items: ContextMenuItem[] = [
      { label: "Editar",       faIcon: <IconEdit size={12} />,     onClick: () => { onEdit(task); } },
      ...(onShowHistory
        ? [{ label: "Ver historial", faIcon: <IconClock size={12} />, onClick: () => { onShowHistory(task); setContextMenu(null); }, separator: true as const }]
        : []),
    ];
    if (status !== "in_progress") items.push({ label: "En progreso", faIcon: <IconProgress size={12} />, onClick: () => { onMoveStatus(task.id, "in_progress"); }, separator: true });
    if (status !== "todo")        items.push({ label: "Por hacer",   faIcon: <IconRestore size={12} />,  onClick: () => { onMoveStatus(task.id, "todo"); } });
    if (status !== "done")        items.push({ label: "Completado",  faIcon: <IconCheck size={12} />,    onClick: () => { onComplete(task.id); } });
    if (status !== "archived")    items.push({ label: "Archivar",    faIcon: <IconArchive size={12} />,  onClick: () => { onMoveStatus(task.id, "archived"); } });
    if (status === "done" || status === "archived")
      items.push({ label: "Restaurar", faIcon: <IconRestore size={12} />, onClick: () => { onRestore(task.id); } });
    return items;
  }, [onEdit, onComplete, onRestore, onMoveStatus, onShowHistory]);

  if (tasks.length === 0) {
    return (
      <>
        <div
          className="flex h-full flex-col items-center justify-center gap-3"
          onContextMenu={handleEmptyAreaContextMenu}
        >
          <div style={{ fontSize: "15px", color: "var(--color-text-muted)" }}>
            Sin tareas por aquí
          </div>
          <div style={{ fontSize: "13px", color: "var(--color-text-muted)", opacity: 0.6 }}>
            Presioná <span className="rounded px-1.5 py-0.5 mx-0.5" style={{ background: "var(--color-surface-active)", color: "var(--color-accent)", fontSize: "13px" }}>+</span> para crear una
          </div>
        </div>
        {emptyContextMenu && onAddTask && (
          <ContextMenu
            x={emptyContextMenu.x}
            y={emptyContextMenu.y}
            items={[
              { label: "Agregar tarea", faIcon: <IconPlus size={12} />, onClick: () => { onAddTask(); setEmptyContextMenu(null); } },
            ]}
            onClose={() => setEmptyContextMenu(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div ref={parentRef} className="h-full overflow-auto" onContextMenu={handleEmptyAreaContextMenu}>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map((vItem) => {
            const task = tasks[vItem.index];
            const isDone = task.status === "done" || task.status === "archived";
            const isHovered = hoveredId === task.id;
            const lineNum = String(vItem.index + 1).padStart(3, " ");

            return (
              <div
                key={task.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vItem.start}px)`,
                  height: `${vItem.size}px`,
                  borderBottom: "1px solid var(--color-border)",
                  background: isHovered ? "var(--color-surface-hover)" : "transparent",
                  boxShadow: isHovered ? "inset 2px 0 0 var(--color-accent)" : "inset 2px 0 0 transparent",
                  transition: "background 0.12s ease, box-shadow 0.12s ease",
                }}
                onContextMenu={(e) => { handleContextMenu(e, task); }}
                onMouseEnter={() => { setHoveredId(task.id); }}
                onMouseLeave={() => { setHoveredId(null); }}
                className="flex items-center"
              >
                {/* Número de línea */}
                <div
                  className="flex h-full w-12 shrink-0 select-none items-center justify-end pr-3"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    opacity: isHovered ? 0.7 : 0.3,
                    color: "var(--color-text-muted)",
                    borderRight: "1px solid var(--color-border)",
                    background: "var(--color-surface-2)",
                    transition: "opacity 0.12s ease",
                  }}
                >
                  {lineNum}
                </div>

                {/* Indicador de prioridad */}
                <div className="flex h-full w-6 shrink-0 items-center justify-center">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR[1],
                      boxShadow: isHovered ? `0 0 6px ${PRIORITY_GLOW[task.priority] ?? PRIORITY_GLOW[1]}` : "none",
                      transition: "box-shadow 0.15s ease",
                    }}
                  />
                </div>

                {/* Checkbox */}
                <button
                  onClick={() => isDone ? onRestore(task.id) : onComplete(task.id)}
                  aria-label={isDone ? "Restaurar" : "Completar"}
                  className="mr-3 flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all duration-150"
                  style={{
                    border: isDone
                      ? "1px solid var(--color-status-done)"
                      : "1px solid var(--color-border-strong)",
                    background: isDone ? "var(--color-status-done)" : "transparent",
                    boxShadow: "none",
                  }}
                >
                  {isDone && (
                    <span style={{ color: "var(--color-surface)", fontSize: "8px", lineHeight: 1 }}>
                      <IconCheck size={10} />
                    </span>
                  )}
                </button>

                {/* Título + descripción */}
                <button
                  onClick={() => onEdit(task)}
                  className="flex flex-1 flex-col items-start overflow-hidden text-left"
                  style={{ gap: "1px" }}
                >
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 500,
                      color: isDone ? "var(--color-text-muted)" : "var(--color-text-primary)",
                      textDecoration: isDone ? "line-through" : "none",
                      opacity: isDone ? 0.55 : 1,
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    {task.title}
                  </span>
                  {task.description && (
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--color-text-muted)",
                        opacity: 0.7,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "block",
                      }}
                    >
                      {task.description}
                    </span>
                  )}
                </button>

                {/* Metadata */}
                <div className="mr-4 flex shrink-0 items-center gap-3">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                  {task.subtasks.length > 0 && (
                    <span
                      className="font-mono text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildMenuItems(contextMenu.task)}
          onClose={() => { setContextMenu(null); }}
        />
      )}
      {emptyContextMenu && onAddTask && (
        <ContextMenu
          x={emptyContextMenu.x}
          y={emptyContextMenu.y}
          items={[
            { label: "Agregar tarea", faIcon: <IconPlus size={12} />, onClick: () => { onAddTask(); setEmptyContextMenu(null); } },
          ]}
          onClose={() => setEmptyContextMenu(null)}
        />
      )}
    </>
  );
}
