/**
 * Modal para ver el historial de cambios de una tarea.
 * Usa TaskHistoryContent; mantiene wrapper modal + header + cerrar por compatibilidad.
 */

import { useEffect } from "react";
import { IconClose } from "@ui/icons/index.tsx";
import { TaskHistoryContent } from "./TaskHistoryContent.tsx";

interface TaskHistoryModalProps {
  taskId: string;
  taskTitle: string;
  onClose: () => void;
}

function truncate(value: string | null, max = 60): string {
  if (value == null) return "—";
  const s = String(value);
  return s.length <= max ? s : s.slice(0, max) + "…";
}

export function TaskHistoryModal({ taskId, taskTitle, onClose }: TaskHistoryModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 backdrop-blur-sm py-8 px-4 sm:py-10 sm:px-6"
      onClick={onClose}
      role="dialog"
      aria-label="Historial de la tarea"
    >
      <div
        className="flex max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] w-full max-w-lg flex-col rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Historial — {truncate(taskTitle, 40)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-active)] hover:text-[var(--color-text-primary)]"
          >
            <IconClose size={14} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <TaskHistoryContent taskId={taskId} taskTitle={taskTitle} />
        </div>
      </div>
    </div>
  );
}
