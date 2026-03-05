/**
 * Vista Kanban — "Technical Noir".
 * Headers tipo comentario de código, columnas con bordes luminosos al recibir drop,
 * tarjetas con glow de prioridad al hover.
 */

import { useState, useCallback } from "react";
import type { TaskDTO } from "@nanpad/core";
import { PriorityBadge } from "@ui/components/Badge.tsx";
import { ContextMenu, type ContextMenuItem } from "@ui/components/ContextMenu.tsx";
import { IconEdit, IconProgress, IconRestore, IconCheck, IconArchive, IconPlus } from "@ui/icons/index.tsx";

interface KanbanViewProps {
  tasks: TaskDTO[];
  onEdit: (task: TaskDTO) => void;
  onMoveStatus: (taskId: string, newStatus: TaskDTO["status"]) => void;
  /** Al hacer click derecho en el contenedor de una columna. */
  onAddTask?: () => void;
}

interface ContextState { x: number; y: number; task: TaskDTO; }

interface Column {
  status: TaskDTO["status"];
  label: string;
  comment: string;
  accentVar: string;
}

const COLUMNS: Column[] = [
  { status: "todo",        label: "Por hacer",   comment: "TODO",        accentVar: "var(--color-status-todo)" },
  { status: "in_progress", label: "En progreso", comment: "IN_PROGRESS", accentVar: "var(--color-status-in-progress)" },
  { status: "done",        label: "Hecho",       comment: "DONE",        accentVar: "var(--color-status-done)" },
  { status: "archived",    label: "Archivado",   comment: "ARCHIVED",    accentVar: "var(--color-status-archived)" },
];

const PRIORITY_BORDER: Record<number, string> = {
  0: "var(--color-border)",
  1: "oklch(0.696 0.17 162.48 / 50%)",
  2: "oklch(0.769 0.188 70.08 / 60%)",
  3: "oklch(0.704 0.191 22.216 / 70%)",
};

const DT_KEY = "nanpad/task-id";

/** Tarjeta arrastrable con glow de prioridad y estética técnica. */
function KanbanCard({
  task,
  onEdit,
  onContextMenu,
}: {
  task: TaskDTO;
  onEdit: (t: TaskDTO) => void;
  onContextMenu: (e: React.MouseEvent, t: TaskDTO) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(DT_KEY, task.id);
      }}
      onClick={() => { onEdit(task); }}
      onContextMenu={(e) => { onContextMenu(e, task); }}
      onMouseEnter={() => { setHovered(true); }}
      onMouseLeave={() => { setHovered(false); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onEdit(task); }}
      style={{
        background: hovered ? "var(--color-surface-hover)" : "var(--color-surface-2)",
        borderTop: `1px solid ${hovered ? "var(--color-border-strong)" : "var(--color-border)"}`,
        borderRight: `1px solid ${hovered ? "var(--color-border-strong)" : "var(--color-border)"}`,
        borderBottom: `1px solid ${hovered ? "var(--color-border-strong)" : "var(--color-border)"}`,
        borderLeft: `2px solid ${PRIORITY_BORDER[task.priority] ?? "var(--color-border)"}`,
        borderRadius: "8px",
        padding: "10px 12px",
        cursor: "grab",
        userSelect: "none",
        transition: "all 0.15s ease",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hovered ? "var(--shadow-md)" : "var(--shadow-sm)",
      }}
    >
      <p
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: hovered ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          lineHeight: 1.45,
          marginBottom: task.description ? "5px" : "10px",
          transition: "color 0.12s ease",
        }}
      >
        {task.title}
      </p>
      {task.description && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--color-text-muted)",
            opacity: 0.8,
            lineHeight: 1.4,
            marginBottom: "10px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {task.description}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <PriorityBadge priority={task.priority} />
        {task.subtasks.length > 0 && (
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
            {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
          </span>
        )}
      </div>
    </div>
  );
}

/** Columna con header tipo comentario de código y borde luminoso al recibir drop. */
function KanbanColumn({
  column,
  tasks,
  onEdit,
  onDrop,
  onContextMenu,
  onAddTask,
}: {
  column: Column;
  tasks: TaskDTO[];
  onEdit: (t: TaskDTO) => void;
  onDrop: (taskId: string, status: TaskDTO["status"]) => void;
  onContextMenu: (e: React.MouseEvent, t: TaskDTO) => void;
  onAddTask?: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [columnMenuPos, setColumnMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleColumnContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setColumnMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <>
    <div
      onContextMenu={handleColumnContextMenu}
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: "210px",
        height: "100%",
        borderRadius: "12px",
        border: dragOver
          ? `1px solid ${column.accentVar}`
          : "1px solid var(--color-border)",
        background: dragOver ? "var(--color-surface-active)" : "var(--color-surface-2)",
        boxShadow: dragOver
          ? `0 0 0 1px ${column.accentVar}22, 0 0 24px ${column.accentVar}18`
          : "var(--shadow-sm)",
        padding: "12px",
        transition: "all 0.18s ease",
        transform: dragOver ? "scale(1.005)" : "scale(1)",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const taskId = e.dataTransfer.getData(DT_KEY);
        if (taskId) onDrop(taskId, column.status);
      }}
    >
      {/* Header de columna */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: column.accentVar,
            }}
          >
            {column.label}
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: column.accentVar,
              background: `${column.accentVar}18`,
              borderRadius: "4px",
              padding: "1px 8px",
            }}
          >
            {tasks.length}
          </span>
        </div>
        <div
          style={{
            height: "1px",
            marginTop: "10px",
            background: `linear-gradient(90deg, ${column.accentVar}50, transparent)`,
          }}
        />
      </div>

      {/* Tarjetas */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onContextMenu={onContextMenu}
          />
        ))}

        {/* Zona de drop — siempre visible */}
        <div
          style={{
            marginTop: "4px",
            minHeight: "44px",
            borderRadius: "7px",
            border: `1px dashed ${dragOver ? column.accentVar : "var(--color-border)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            color: dragOver ? column.accentVar : "var(--color-text-muted)",
            opacity: dragOver ? 1 : 0.4,
            transition: "all 0.15s ease",
          }}
        >
          {dragOver ? "Soltar aquí" : tasks.length === 0 ? "Sin tareas" : "Arrastrar aquí"}
        </div>
      </div>
    </div>
    {columnMenuPos && onAddTask && (
      <ContextMenu
        x={columnMenuPos.x}
        y={columnMenuPos.y}
        items={[
          { label: "Agregar tarea", faIcon: <IconPlus size={12} />, onClick: () => { onAddTask(); setColumnMenuPos(null); } },
        ]}
        onClose={() => setColumnMenuPos(null)}
      />
    )}
    </>
  );
}

/** Vista Kanban principal. */
export function KanbanView({ tasks, onEdit, onMoveStatus, onAddTask }: KanbanViewProps) {
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);

  const handleDrop = (taskId: string, status: TaskDTO["status"]) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== status) onMoveStatus(taskId, status);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, task: TaskDTO) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, task });
  }, []);

  const buildMenuItems = useCallback((task: TaskDTO): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      { label: "Editar", faIcon: <IconEdit size={12} />, onClick: () => { onEdit(task); } },
    ];
    const allStatuses: { status: TaskDTO["status"]; label: string; faIcon: React.ReactNode }[] = [
      { status: "todo",        label: "Por hacer",   faIcon: <IconRestore size={12} /> },
      { status: "in_progress", label: "En progreso", faIcon: <IconProgress size={12} /> },
      { status: "done",        label: "Hecho",       faIcon: <IconCheck size={12} /> },
      { status: "archived",    label: "Archivado",   faIcon: <IconArchive size={12} /> },
    ];
    allStatuses
      .filter((s) => s.status !== task.status)
      .forEach((s, i) => {
        items.push({
          label: `→ ${s.label}`,
          faIcon: s.faIcon,
          onClick: () => { onMoveStatus(task.id, s.status); },
          separator: i === 0,
        });
      });
    return items;
  }, [onEdit, onMoveStatus]);

  return (
    <>
      <div
        style={{
          display: "flex",
          height: "100%",
          gap: "12px",
          overflowX: "auto",
          padding: "16px",
        }}
      >
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            column={col}
            tasks={tasks.filter((t) => t.status === col.status)}
            onEdit={onEdit}
            onDrop={handleDrop}
            onContextMenu={handleContextMenu}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildMenuItems(contextMenu.task)}
          onClose={() => { setContextMenu(null); }}
        />
      )}
    </>
  );
}
