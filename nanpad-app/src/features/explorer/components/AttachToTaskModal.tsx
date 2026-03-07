/**
 * Modal para adjuntar la selección del editor a una tarea existente.
 */

import { useEffect, useState, useCallback } from "react";
import { useApp } from "@app/AppContext.tsx";
import type { TaskDTO } from "@nanpad/core";
import { IconClose } from "@ui/icons/index.tsx";
import { StatusBadge } from "@ui/components/Badge.tsx";

export interface AttachToTaskPayload {
  content: string;
  language?: string | null;
  filePath?: string | null;
  lineStart?: number | null;
  lineEnd?: number | null;
}

interface AttachToTaskModalProps {
  payload: AttachToTaskPayload;
  onClose: () => void;
  onAttached?: () => void;
}

export function AttachToTaskModal({ payload, onClose, onAttached }: AttachToTaskModalProps) {
  const uc = useApp();
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    uc.listTasks.execute({}).then((r) => setTasks(r.tasks)).finally(() => setLoading(false));
  }, [uc.listTasks]);

  const filtered = query.trim()
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.description?.toLowerCase().includes(query.toLowerCase())
      )
    : tasks;

  const handleAttach = useCallback(
    async (taskId: string) => {
      setAttaching(true);
      setError("");
      try {
        await uc.attachCodeToTask.execute({
          taskId,
          content: payload.content,
          language: payload.language ?? null,
          filePath: payload.filePath ?? null,
          lineStart: payload.lineStart ?? null,
          lineEnd: payload.lineEnd ?? null,
        });
        onAttached?.();
        window.dispatchEvent(new CustomEvent("nanpad:code-attached", { detail: { taskId } }));
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al adjuntar");
      } finally {
        setAttaching(false);
      }
    },
    [uc.attachCodeToTask, payload, onClose, onAttached]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 backdrop-blur-sm py-8 px-4 sm:py-10 sm:px-6"
      onClick={onClose}
      role="dialog"
      aria-label="Añadir a tarea"
    >
      <div
        className="flex max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] w-full max-w-md flex-col rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Añadir a tarea</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-active)] hover:text-[var(--color-text-primary)]"
          >
            <IconClose size={14} />
          </button>
        </div>
        <div className="shrink-0 px-4 py-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tarea por título…"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
            autoFocus
          />
        </div>
        {error && (
          <div className="shrink-0 px-4 py-1 text-xs text-[var(--color-priority-high)]">{error}</div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {loading ? (
            <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">Cargando tareas…</p>
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">No hay tareas o no coincide la búsqueda.</p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    disabled={attaching}
                    onClick={() => void handleAttach(task.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-surface-active)] disabled:opacity-50"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-[var(--color-text-primary)]">{task.title}</span>
                    <span className="shrink-0">
                      <StatusBadge status={task.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
