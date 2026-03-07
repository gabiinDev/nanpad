/**
 * Contenido del historial de una tarea (lista de entradas).
 * Para usar dentro de un drawer o modal; no incluye wrapper ni botón cerrar.
 */

import { useEffect, useState } from "react";
import { useApp } from "@app/AppContext.tsx";
import type { HistoryEntryDTO } from "@nanpad/core";
import { getStatusLabel } from "@ui/components/Badge.tsx";

interface TaskHistoryContentProps {
  taskId: string;
  taskTitle: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: "Creación",
  update: "Actualización",
  delete: "Eliminación",
  complete: "Completada",
  restore: "Restaurada",
  status_change: "Cambio de estado",
  assign: "Asignación",
  unassign: "Desasignación",
  subtask_added: "Subtarea añadida",
  subtask_removed: "Subtarea eliminada",
  subtask_completed: "Subtarea (completada / pendiente)",
  attachment_added: "Adjunto añadido",
  attachment_removed: "Adjunto quitado",
};

/** Clases de borde/estilo por tipo de acción para distinguir visualmente. */
const ACTION_STYLES: Record<string, { border: string; bg: string; label: string }> = {
  create: {
    border: "border-l-[var(--color-priority-low)]",
    bg: "bg-[var(--color-priority-low)]/8",
    label: "text-[var(--color-priority-low)]",
  },
  update: {
    border: "border-l-[var(--color-accent)]",
    bg: "bg-[var(--color-accent-subtle)]",
    label: "text-[var(--color-accent)]",
  },
  complete: {
    border: "border-l-[var(--color-status-done)]",
    bg: "bg-[var(--color-status-done)]/10",
    label: "text-[var(--color-status-done)]",
  },
  restore: {
    border: "border-l-[var(--color-status-todo)]",
    bg: "bg-[var(--color-status-todo)]/10",
    label: "text-[var(--color-status-todo)]",
  },
  status_change: {
    border: "border-l-[var(--color-status-in-progress)]",
    bg: "bg-[var(--color-status-in-progress)]/10",
    label: "text-[var(--color-status-in-progress)]",
  },
  delete: {
    border: "border-l-[var(--color-priority-high)]",
    bg: "bg-[var(--color-priority-high)]/10",
    label: "text-[var(--color-priority-high)]",
  },
  assign: {
    border: "border-l-[var(--color-accent)]",
    bg: "bg-[var(--color-accent-subtle)]",
    label: "text-[var(--color-accent)]",
  },
  unassign: {
    border: "border-l-[var(--color-text-muted)]",
    bg: "bg-[var(--color-surface-active)]",
    label: "text-[var(--color-text-muted)]",
  },
  subtask_added: {
    border: "border-l-[var(--color-priority-low)]",
    bg: "bg-[var(--color-priority-low)]/10",
    label: "text-[var(--color-priority-low)]",
  },
  subtask_removed: {
    border: "border-l-[var(--color-priority-high)]",
    bg: "bg-[var(--color-priority-high)]/10",
    label: "text-[var(--color-priority-high)]",
  },
  subtask_completed: {
    border: "border-l-[var(--color-status-done)]",
    bg: "bg-[var(--color-status-done)]/10",
    label: "text-[var(--color-status-done)]",
  },
  attachment_added: {
    border: "border-l-[var(--color-accent)]",
    bg: "bg-[var(--color-accent-subtle)]",
    label: "text-[var(--color-accent)]",
  },
  attachment_removed: {
    border: "border-l-[var(--color-text-muted)]",
    bg: "bg-[var(--color-surface-active)]",
    label: "text-[var(--color-text-muted)]",
  },
};

function getActionStyle(action: string) {
  return (
    ACTION_STYLES[action] ?? {
      border: "border-l-[var(--color-border-strong)]",
      bg: "bg-[var(--color-surface)]",
      label: "text-[var(--color-text-secondary)]",
    }
  );
}

const FIELD_NAME_LABELS: Record<string, string> = {
  status: "Estado",
  completedAt: "Fecha de completado",
  title: "Título",
  description: "Descripción",
  priority: "Prioridad",
  categoryIds: "Categorías",
  tagIds: "Etiquetas",
  subtask: "Subtarea",
  adjunto: "Adjunto",
};

const LOCALE_AR = "es-AR";

function formatDateAr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(LOCALE_AR, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(value: string | null, max = 60): string {
  if (value == null) return "—";
  const s = String(value);
  return s.length <= max ? s : s.slice(0, max) + "…";
}

function getFieldNameLabel(fieldName: string | null): string {
  if (fieldName == null) return "";
  return FIELD_NAME_LABELS[fieldName] ?? fieldName;
}

function formatHistoryValue(fieldName: string | null, value: string | null): string {
  if (value == null) return "—";
  const s = String(value);
  if (fieldName === "status") return getStatusLabel(s);
  if (fieldName === "completedAt") {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return formatDateAr(s);
  }
  return s;
}

const PAGE_SIZE = 20;

/**
 * Lista de entradas de historial de la tarea con paginación. Sin header ni botón cerrar.
 */
export function TaskHistoryContent({ taskId, taskTitle }: TaskHistoryContentProps) {
  const uc = useApp();
  const [entries, setEntries] = useState<HistoryEntryDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const hasMore = entries.length < total;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setPage(0);
    setEntries([]);
    setTotal(0);
    uc.getEntityHistory
      .execute({ entityType: "task", entityId: taskId, limit: PAGE_SIZE, offset: 0 })
      .then((result) => {
        if (!cancelled) {
          setEntries(result.entries);
          setTotal(result.total);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar historial");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [uc.getEntityHistory, taskId]);

  const loadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    uc.getEntityHistory
      .execute({
        entityType: "task",
        entityId: taskId,
        limit: PAGE_SIZE,
        offset: nextPage * PAGE_SIZE,
      })
      .then((result) => {
        setEntries((prev) => [...prev, ...result.entries]);
        setPage(nextPage);
      })
      .finally(() => setLoadingMore(false));
  };

  if (loading) {
    return (
      <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
        Cargando historial…
      </p>
    );
  }
  if (error) {
    return (
      <p className="py-6 text-center text-sm text-[var(--color-priority-high)]">
        {error}
      </p>
    );
  }
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
        Sin registros de cambios.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs text-[var(--color-text-muted)]">
        {total} {total === 1 ? "registro" : "registros"}
      </p>
      <ul className="space-y-3" aria-label={`Historial de ${truncate(taskTitle, 40)}`}>
        {entries.map((entry) => {
          const style = getActionStyle(entry.action);
          return (
            <li
              key={entry.id}
              className={`rounded-lg border border-[var(--color-border)] border-l-4 ${style.border} ${style.bg} px-3 py-2.5 text-sm`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`font-semibold ${style.label}`}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                  {formatDateAr(entry.createdAt)}
                </span>
              </div>
              {(entry.fieldName != null || entry.oldValue != null || entry.newValue != null) && (
                <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs">
                  {entry.fieldName != null && (
                    <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-medium text-[var(--color-text-muted)]">
                      {getFieldNameLabel(entry.fieldName)}
                    </span>
                  )}
                  {entry.oldValue != null && (
                    <span className="rounded bg-[var(--color-priority-high)]/15 px-1.5 py-0.5 text-[var(--color-priority-high)] line-through">
                      {truncate(formatHistoryValue(entry.fieldName ?? null, entry.oldValue), 50)}
                    </span>
                  )}
                  {entry.oldValue != null && entry.newValue != null && (
                    <span className="text-[var(--color-text-muted)]" aria-hidden="true">→</span>
                  )}
                  {entry.newValue != null && (
                    <span className="rounded bg-[var(--color-status-done)]/15 px-1.5 py-0.5 font-medium text-[var(--color-status-done)]">
                      {truncate(formatHistoryValue(entry.fieldName ?? null, entry.newValue), 50)}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-60"
          >
            {loadingMore ? "Cargando…" : `Cargar más (${entries.length} de ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
