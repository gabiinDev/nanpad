/**
 * Vista de lista de tareas — estilo "code editor".
 * Números de línea monoespaciados a la izquierda, hover con glow de acento,
 * indicador de prioridad como punto luminoso.
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TaskDTO, CategoryDTO } from "@nanpad/core";
import { useNavFocusStore } from "@/store/useNavFocusStore.ts";
import { StatusBadge, PriorityBadge } from "@ui/components/Badge.tsx";
import { CategoryBadge } from "@ui/components/CategoryBadge.tsx";
import { ContextMenu, type ContextMenuItem } from "@ui/components/ContextMenu.tsx";
import { SubtaskCheckbox } from "@ui/components/SubtaskCheckbox.tsx";
import { IconCheck, IconProgress, IconArchive, IconRestore, IconEdit, IconPlus, IconClock, IconChevronDown, IconChevron } from "@ui/icons/index.tsx";

interface TaskListViewProps {
  tasks: TaskDTO[];
  categories: CategoryDTO[];
  onEdit: (task: TaskDTO) => void;
  onComplete: (id: string) => void;
  onRestore: (id: string) => void;
  onMoveStatus: (id: string, status: TaskDTO["status"]) => void;
  /** Al hacer click derecho en el contenedor (fuera de una tarea). */
  onAddTask?: () => void;
  /** Abrir modal de historial de la tarea. */
  onShowHistory?: (task: TaskDTO) => void;
  /** Alternar subtarea completada desde la vista (sin abrir modal). */
  onToggleSubtask?: (task: TaskDTO, subtaskId: string) => void;
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
export function TaskListView({ tasks, categories, onEdit, onComplete, onRestore, onMoveStatus, onAddTask, onShowHistory, onToggleSubtask }: TaskListViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);
  const [emptyContextMenu, setEmptyContextMenu] = useState<EmptyContextState | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedSubtaskIds, setExpandedSubtaskIds] = useState<Set<string>>(new Set());
  const focusTaskId = useNavFocusStore((s) => s.focusTaskId);
  const setFocusTaskId = useNavFocusStore((s) => s.setFocusTaskId);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    getItemKey: (index) => {
      const t = tasks[index];
      const id = t?.id ?? String(index);
      const expanded = t ? expandedSubtaskIds.has(t.id) : false;
      return `${id}-${expanded}`;
    },
    estimateSize: (index) => {
      const t = tasks[index];
      if (!t || !expandedSubtaskIds.has(t.id) || t.subtasks.length === 0) return 76;
      // Altura fila base + bloque subtareas (padding + línea por subtarea) para que el contenedor no se rompa
      return 76 + 16 + t.subtasks.length * 32;
    },
    overscan: 10,
  });

  // Recalcular alturas cuando se expande/colapsa subtareas
  useEffect(() => {
    const v = virtualizer as { measure?: () => void };
    v.measure?.();
  }, [expandedSubtaskIds, virtualizer]);

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
                  minHeight: 0,
                  overflow: "hidden",
                  borderBottom: "1px solid var(--color-border)",
                  background: isHovered ? "var(--color-surface-hover)" : "transparent",
                  boxShadow: isHovered ? "inset 2px 0 0 var(--color-accent)" : "inset 2px 0 0 transparent",
                  transition: "background 0.12s ease, box-shadow 0.12s ease",
                  display: "flex",
                  flexDirection: "row",
                }}
                onContextMenu={(e) => { handleContextMenu(e, task); }}
                onMouseEnter={() => { setHoveredId(task.id); }}
                onMouseLeave={() => { setHoveredId(null); }}
              >
                {/* Columna número de línea — ocupa todo el alto de la card */}
                <div
                  className="flex w-12 shrink-0 select-none items-center justify-end pr-3"
                  style={{
                    alignSelf: "stretch",
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

                {/* Contenido: fila principal + subtareas (flex column para que se estire hacia abajo) */}
                <div className="flex min-w-0 flex-1 flex-col">
                {/* Fila principal de la tarea — click en la fila expande/contrae subtareas si las tiene */}
                <div
                  className="flex min-h-[44px] shrink-0 items-center"
                  role={task.subtasks.length > 0 ? "button" : undefined}
                  tabIndex={task.subtasks.length > 0 ? 0 : undefined}
                  aria-label={task.subtasks.length > 0 ? (expandedSubtaskIds.has(task.id) ? "Contraer subtareas" : "Expandir subtareas") : undefined}
                  onClick={
                    task.subtasks.length > 0
                      ? (e) => {
                          if ((e.target as HTMLElement).closest("button")) return;
                          setExpandedSubtaskIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(task.id)) next.delete(task.id);
                            else next.add(task.id);
                            return next;
                          });
                        }
                      : undefined
                  }
                  onKeyDown={
                    task.subtasks.length > 0
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedSubtaskIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(task.id)) next.delete(task.id);
                              else next.add(task.id);
                              return next;
                            });
                          }
                        }
                      : undefined
                  }
                  style={{
                    cursor: task.subtasks.length > 0 ? "pointer" : "default",
                  }}
                >
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
                  type="button"
                  onClick={(e) => { e.stopPropagation(); (isDone ? onRestore(task.id) : onComplete(task.id)); }}
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

                {/* Título + descripción (sin click; editar con el icono) */}
                <div
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
                  {task.categoryIds.length > 0 && (
                    <div
                      className="flex shrink-0 flex-wrap gap-1 overflow-hidden"
                      style={{ marginTop: "4px", maxHeight: "24px" }}
                    >
                      {task.categoryIds.slice(0, 4).map((catId) => {
                        const cat = categories.find((c) => c.id === catId);
                        return cat ? <CategoryBadge key={cat.id} category={cat} compact /> : null;
                      })}
                      {task.categoryIds.length > 4 && (
                        <span
                          className="shrink-0 text-xs"
                          style={{ color: "var(--color-text-muted)", alignSelf: "flex-end" }}
                          title={task.categoryIds
                            .slice(4)
                            .map((catId) => categories.find((c) => c.id === catId)?.name ?? catId)
                            .filter(Boolean)
                            .join(", ")}
                        >
                          +{task.categoryIds.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Metadata + icono editar */}
                <div className="mr-4 flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                    title="Editar tarea"
                    aria-label="Editar tarea"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors hover:bg-[var(--color-surface-active)]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <IconEdit size={14} />
                  </button>
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                  {task.subtasks.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedSubtaskIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(task.id)) next.delete(task.id);
                          else next.add(task.id);
                          return next;
                        });
                      }}
                      className="flex items-center gap-1 font-mono text-xs transition-colors hover:text-[var(--color-text-secondary)]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {expandedSubtaskIds.has(task.id) ? (
                        <IconChevronDown size={10} />
                      ) : (
                        <IconChevron size={10} />
                      )}
                      Subtareas {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                    </button>
                  )}
                </div>
                </div>

                {/* Subtareas expandibles — la card se estira hacia abajo */}
                {task.subtasks.length > 0 && expandedSubtaskIds.has(task.id) && (
                  <div
                    className="flex shrink-0 flex-col gap-2 border-l-2 border-[var(--color-accent-subtle)] py-2 pl-4 pr-4"
                    style={{ borderColor: "var(--color-accent-subtle)", marginLeft: "0.5rem", minHeight: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {task.subtasks.map((s) => {
                      const checkboxId = `subtask-${task.id}-${s.id}`;
                      return (
                        <div
                          key={s.id}
                          className="flex min-h-[28px] items-start gap-2 text-xs"
                        >
                          {onToggleSubtask ? (
                            <SubtaskCheckbox
                              id={checkboxId}
                              checked={s.completed}
                              onChange={() => onToggleSubtask(task, s.id)}
                              aria-label={`Marcar "${s.title}" como completada`}
                            />
                          ) : null}
                          <label
                            htmlFor={onToggleSubtask ? checkboxId : undefined}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              overflowWrap: "break-word",
                              wordBreak: "break-word",
                              color: "var(--color-text-secondary)",
                              textDecoration: s.completed ? "line-through" : "none",
                              opacity: s.completed ? 0.7 : 1,
                              cursor: onToggleSubtask ? "pointer" : "default",
                            }}
                          >
                            {s.title}
                          </label>
                        </div>
                      );
                    })}
                  </div>
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
