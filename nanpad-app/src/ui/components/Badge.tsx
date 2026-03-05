/**
 * Badges de estado y prioridad.
 */

import type { TaskDTO } from "@nanpad/core";

const STATUS_CONFIG: Record<TaskDTO["status"], { label: string; colorVar: string }> = {
  todo:        { label: "por hacer",  colorVar: "--color-status-todo" },
  in_progress: { label: "en curso",   colorVar: "--color-status-in-progress" },
  done:        { label: "hecho",      colorVar: "--color-status-done" },
  archived:    { label: "archivado",  colorVar: "--color-status-archived" },
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  0: { label: "baja",    color: "var(--color-priority-low)" },
  1: { label: "media",   color: "var(--color-priority-medium)" },
  2: { label: "alta",    color: "var(--color-priority-high)" },
  3: { label: "crítica", color: "var(--color-priority-critical)" },
};

/** Badge de estado. */
export function StatusBadge({ status }: { status: TaskDTO["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        fontSize: "12px",
        fontWeight: 500,
        color: `var(${cfg.colorVar})`,
        background: `color-mix(in oklch, var(${cfg.colorVar}) 12%, transparent)`,
        border: `1px solid color-mix(in oklch, var(${cfg.colorVar}) 30%, transparent)`,
        borderRadius: "5px",
        padding: "2px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

/** Badge de prioridad — punto de color + etiqueta. */
export function PriorityBadge({ priority }: { priority: number }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG[1];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "12px",
        color: cfg.color,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: cfg.color,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}
