/**
 * Modal para ver el historial de cambios de una tarea.
 * Usa GetTaskHistory y muestra la lista de entradas ordenadas (más reciente abajo).
 */

import { useEffect, useState } from "react";
import { useApp } from "@app/AppContext.tsx";
import type { HistoryEntryDTO } from "@nanpad/core";
import { IconClose } from "@ui/icons/index.tsx";
import { getStatusLabel } from "@ui/components/Badge.tsx";

interface TaskHistoryModalProps {
  taskId: string;
  taskTitle: string;
  onClose: () => void;
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
};

/** Nombres de campo en español para el historial. */
const FIELD_NAME_LABELS: Record<string, string> = {
  status: "Estado",
  completedAt: "Fecha de completado",
  title: "Título",
  description: "Descripción",
  priority: "Prioridad",
  categoryIds: "Categorías",
  tagIds: "Etiquetas",
};

const LOCALE_AR = "es-AR";

/** Fecha/hora en formato Argentina (dd/MM/yyyy, HH:mm). */
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

function formatDate(iso: string): string {
  return formatDateAr(iso);
}

function truncate(value: string | null, max = 60): string {
  if (value == null) return "—";
  const s = String(value);
  return s.length <= max ? s : s.slice(0, max) + "…";
}

/** Etiqueta legible del nombre del campo. */
function getFieldNameLabel(fieldName: string | null): string {
  if (fieldName == null) return "";
  return FIELD_NAME_LABELS[fieldName] ?? fieldName;
}

/** Formatea el valor para mostrar en historial (status → etiqueta, completedAt → fecha AR). */
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

export function TaskHistoryModal({ taskId, taskTitle, onClose }: TaskHistoryModalProps) {
  const uc = useApp();
  const [entries, setEntries] = useState<HistoryEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    uc.getEntityHistory
      .execute({ entityType: "task", entityId: taskId })
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar historial");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [uc.getEntityHistory, taskId]);

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
          {loading ? (
            <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">Cargando historial…</p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-[var(--color-priority-high)]">{error}</p>
          ) : entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">Sin registros de cambios.</p>
          ) : (
            <ul className="space-y-3">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                  {(entry.fieldName != null || entry.oldValue != null || entry.newValue != null) && (
                    <div className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
                      {entry.fieldName != null && (
                        <span className="text-[var(--color-text-muted)]">{getFieldNameLabel(entry.fieldName)}: </span>
                      )}
                      {entry.oldValue != null && (
                        <span className="line-through opacity-80">{truncate(formatHistoryValue(entry.fieldName ?? null, entry.oldValue), 50)}</span>
                      )}
                      {entry.oldValue != null && entry.newValue != null && (
                        <span className="mx-1 text-[var(--color-text-muted)]">→</span>
                      )}
                      {entry.newValue != null && (
                        <span>{truncate(formatHistoryValue(entry.fieldName ?? null, entry.newValue), 50)}</span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
