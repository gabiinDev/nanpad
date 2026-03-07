/**
 * Modal para crear y editar tareas — Technical Noir.
 * Estética de panel de editor con inputs estilo terminal.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { TaskDTO, CategoryDTO, CreateTaskInput, UpdateTaskInput, SubtaskDTO, CodeSnippetDTO } from "@nanpad/core";
import { useApp } from "@app/AppContext.tsx";
import { useExplorerStore } from "@/store/useExplorerStore.ts";
import { useRouteStore } from "@/store/useRouteStore.ts";
import { fileExists } from "@/infrastructure/FsService.ts";
import { IconClose } from "@ui/icons/index.tsx";
import { IconClock } from "@ui/icons/index.tsx";
import { IconFileCode } from "@ui/icons/index.tsx";
import { CategoryBadge } from "@ui/components/CategoryBadge.tsx";
import { SubtaskCheckbox } from "@ui/components/SubtaskCheckbox.tsx";

interface TaskFormProps {
  task?: TaskDTO | null;
  categories: CategoryDTO[];
  onSave: (input: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  onClose: () => void;
  /** Solo en edición: UseCases para subtareas y callback para refrescar la tarea en el padre. */
  addSubtask?: (taskId: string, title: string) => Promise<SubtaskDTO>;
  updateSubtask?: (taskId: string, subtaskId: string, patch: { title?: string; completed?: boolean }) => Promise<void>;
  deleteSubtask?: (taskId: string, subtaskId: string) => Promise<void>;
  onSubtaskChange?: (updatedTask: TaskDTO) => void;
  /** Solo en edición: abre el modal de historial de la tarea. */
  onShowHistory?: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 0, label: "baja",     color: "var(--color-priority-low)" },
  { value: 1, label: "media",    color: "var(--color-priority-medium)" },
  { value: 2, label: "alta",     color: "var(--color-priority-high)" },
  { value: 3, label: "crítica",  color: "var(--color-priority-critical)" },
] as const;

const STATUS_OPTIONS: { value: TaskDTO["status"]; label: string; color: string }[] = [
  { value: "todo",        label: "por hacer",   color: "var(--color-status-todo)" },
  { value: "in_progress", label: "en progreso", color: "var(--color-status-in-progress)" },
  { value: "done",        label: "hecho",       color: "var(--color-status-done)" },
  { value: "archived",    label: "archivado",   color: "var(--color-status-archived)" },
];

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--color-text-secondary)",
  marginBottom: "7px",
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--color-surface)",
  border: "1px solid var(--color-border-strong)",
  borderRadius: "7px",
  padding: "9px 13px",
  fontSize: "15px",
  color: "var(--color-text-primary)",
  fontFamily: "'Geist', system-ui, sans-serif",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

/**
 * Modal de tarea con estética de editor.
 */
export function TaskForm({
  task,
  categories,
  onSave,
  onClose,
  addSubtask: addSubtaskFn,
  updateSubtask: updateSubtaskFn,
  deleteSubtask: deleteSubtaskFn,
  onSubtaskChange,
  onShowHistory,
}: TaskFormProps) {
  const uc = useApp();
  const openFileAtLine = useExplorerStore((s) => s.openFileAtLine);
  const setRoute = useRouteStore((s) => s.setRoute);
  const isEditing = Boolean(task);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>((task?.priority as 0|1|2|3) ?? 1);
  const [status, setStatus] = useState<TaskDTO["status"]>(task?.status ?? "todo");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(task?.categoryIds ?? []);
  const [subtasks, setSubtasks] = useState<SubtaskDTO[]>(task?.subtasks ?? []);
  const [codeSnippets, setCodeSnippets] = useState<CodeSnippetDTO[]>([]);
  const [orphanSnippet, setOrphanSnippet] = useState<CodeSnippetDTO | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSubtasks(task?.subtasks ?? []);
  }, [task?.id, task?.subtasks]);

  const loadSnippets = useCallback(() => {
    if (!task?.id) return;
    uc.listCodeSnippetsForTask.execute(task.id).then(setCodeSnippets);
  }, [task?.id, uc.listCodeSnippetsForTask]);

  useEffect(() => {
    if (!task?.id) {
      setCodeSnippets([]);
      return;
    }
    loadSnippets();
  }, [task?.id, loadSnippets]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { taskId } = (e as CustomEvent<{ taskId: string }>).detail;
      if (task?.id === taskId) loadSnippets();
    };
    window.addEventListener("nanpad:code-attached", handler as EventListener);
    return () => window.removeEventListener("nanpad:code-attached", handler as EventListener);
  }, [task?.id, loadSnippets]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => { document.removeEventListener("keydown", handler); };
  }, [onClose]);

  const toggleCategory = useCallback((id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  const handleAddSubtask = useCallback(async () => {
    const title = newSubtaskTitle.trim();
    if (!title || !task || !addSubtaskFn) return;
    try {
      const created = await addSubtaskFn(task.id, title);
      const updated = { ...task, subtasks: [...subtasks, created] };
      setSubtasks(updated.subtasks);
      setNewSubtaskTitle("");
      onSubtaskChange?.(updated);
      requestAnimationFrame(() => {
        subtaskInputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        subtaskInputRef.current?.focus();
      });
    } catch {
      setError("Error al añadir subtarea");
    }
  }, [task, subtasks, newSubtaskTitle, addSubtaskFn, onSubtaskChange]);

  const handleToggleSubtask = useCallback(
    async (subtaskId: string) => {
      if (!task || !updateSubtaskFn) return;
      const sub = subtasks.find((s) => s.id === subtaskId);
      if (!sub) return;
      try {
        await updateSubtaskFn(task.id, subtaskId, { completed: !sub.completed });
        const updated = {
          ...task,
          subtasks: subtasks.map((s) =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
          ),
        };
        setSubtasks(updated.subtasks);
        onSubtaskChange?.(updated);
      } catch {
        setError("Error al actualizar subtarea");
      }
    },
    [task, subtasks, updateSubtaskFn, onSubtaskChange]
  );

  const handleDeleteSubtask = useCallback(
    async (subtaskId: string) => {
      if (!task || !deleteSubtaskFn) return;
      try {
        await deleteSubtaskFn(task.id, subtaskId);
        const updated = { ...task, subtasks: subtasks.filter((s) => s.id !== subtaskId) };
        setSubtasks(updated.subtasks);
        onSubtaskChange?.(updated);
      } catch {
        setError("Error al eliminar subtarea");
      }
    },
    [task, subtasks, deleteSubtaskFn, onSubtaskChange]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("el título es obligatorio"); return; }
    setSaving(true);
    setError("");
    try {
      if (isEditing && task) {
        await onSave({ id: task.id, title: title.trim(), description: description.trim() || null, priority, categoryIds: selectedCategories } satisfies UpdateTaskInput);
      } else {
        await onSave({ title: title.trim(), description: description.trim() || null, priority, categoryIds: selectedCategories } satisfies CreateTaskInput);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error al guardar la tarea");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (orphanSnippet) {
        setOrphanSnippet(null);
        e.preventDefault();
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, orphanSnippet]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        padding: "2rem 1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-scale-in"
        style={{
          width: "100%",
          maxWidth: "480px",
          maxHeight: "calc(100vh - 4rem)",
          display: "flex",
          flexDirection: "column",
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border-strong)",
          borderRadius: "12px",
          boxShadow: "var(--shadow-xl), var(--shadow-glow-accent)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px 14px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>
              {isEditing ? "Editar tarea" : "Nueva tarea"}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {onShowHistory && (
                <button
                  type="button"
                  onClick={onShowHistory}
                  aria-label="Ver historial"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                    background: "transparent",
                    color: "var(--color-text-muted)",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--color-surface-active)";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
                  }}
                >
                  <IconClock size={12} />
                  Historial
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Cerrar"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                border: "none",
                background: "transparent",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                fontSize: "16px",
                lineHeight: 1,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--color-surface-active)";
                (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
              }}
            >
              <IconClose size={14} />
            </button>
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <form
          onSubmit={(e) => { void handleSubmit(e); }}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Título */}
          <div>
            <label style={labelStyle}>Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); }}
              placeholder="nombre de la tarea..."
              autoFocus
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-strong)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Descripción */}
          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); }}
              placeholder="contexto, detalles... (soporta markdown)"
              rows={3}
              style={{ ...inputStyle, resize: "none", fontSize: "14px" }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-strong)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Categorías (debajo de descripción) */}
          {categories.length > 0 && (
            <div>
              <label style={labelStyle}>Categorías</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {categories.map((cat) => {
                  const active = selectedCategories.includes(cat.id);
                  return (
                    <CategoryBadge
                      key={cat.id}
                      category={cat}
                      active={active}
                      colorMode="selection"
                      onClick={() => toggleCategory(cat.id)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Prioridad */}
          <div>
            <label style={labelStyle}>Prioridad</label>
            <div style={{ display: "flex", gap: "6px" }}>
              {PRIORITY_OPTIONS.map((opt) => {
                const active = priority === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setPriority(opt.value); }}
                    style={{
                      flex: 1,
                      padding: "7px 4px",
                      borderRadius: "6px",
                      border: `1px solid ${active ? opt.color : "var(--color-border)"}`,
                      background: active ? `${opt.color}18` : "transparent",
                      color: active ? opt.color : "var(--color-text-muted)",
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estado (solo edición) */}
          {isEditing && (
            <div>
              <label style={labelStyle}>Estado</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map((opt) => {
                  const active = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setStatus(opt.value); }}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "6px",
                        border: `1px solid ${active ? opt.color : "var(--color-border)"}`,
                        background: active ? `${opt.color}18` : "transparent",
                        color: active ? opt.color : "var(--color-text-muted)",
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.12s ease",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Adjuntos de código (solo edición, mostrados como links) */}
          {isEditing && codeSnippets.length > 0 && (
            <div>
              <label style={labelStyle}>Adjuntos</label>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                {codeSnippets.map((snippet) => {
                  const fileName = snippet.filePath
                    ? snippet.filePath.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? snippet.filePath
                    : "archivo";
                  const lines =
                    snippet.lineStart != null && snippet.lineEnd != null
                      ? snippet.lineStart === snippet.lineEnd
                        ? `línea ${snippet.lineStart}`
                        : `líneas ${snippet.lineStart}–${snippet.lineEnd}`
                      : "";
                  const label = `${fileName}${lines ? ` (${lines})` : ""}`;
                  return (
                    <li key={snippet.id}>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!snippet.filePath) return;
                          const exists = await fileExists(snippet.filePath);
                          if (exists) {
                            setRoute("documents");
                            void openFileAtLine(
                              snippet.filePath,
                              snippet.lineStart ?? 1,
                              snippet.lineEnd ?? undefined
                            );
                          } else {
                            setOrphanSnippet(snippet);
                          }
                        }}
                        disabled={!snippet.filePath}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "6px 10px",
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "7px",
                          cursor: snippet.filePath ? "pointer" : "default",
                          textAlign: "left",
                          fontSize: "13px",
                          color: snippet.filePath ? "var(--color-accent)" : "var(--color-text-muted)",
                          transition: "all 0.12s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (snippet.filePath) {
                            (e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface-hover)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-accent)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
                        }}
                        title={snippet.filePath ? `Abrir en explorador: ${snippet.filePath}` : "Sin ruta de archivo"}
                      >
                        <IconFileCode size={14} className="shrink-0" />
                        <span className="truncate">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Modal: adjunto inexistente — ofrecer quitar */}
          {orphanSnippet && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 py-8 px-4"
              onClick={() => setOrphanSnippet(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="orphan-snippet-title"
            >
              <div
                className="w-full max-w-sm rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] p-6 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 id="orphan-snippet-title" className="mb-2 text-base font-semibold text-[var(--color-text-primary)]">
                  Adjunto inexistente
                </h3>
                <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
                  El archivo ya no existe en disco. ¿Querés quitar este adjunto de la tarea?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOrphanSnippet(null)}
                    className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-active)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (orphanSnippet) {
                        await uc.deleteCodeSnippet.execute(orphanSnippet.id);
                        setCodeSnippets((prev) => prev.filter((s) => s.id !== orphanSnippet.id));
                        setOrphanSnippet(null);
                      }
                    }}
                    className="rounded-lg border border-[var(--color-priority-high)] bg-[var(--color-priority-high)]/15 px-3 py-1.5 text-sm font-medium text-[var(--color-priority-high)] hover:bg-[var(--color-priority-high)]/25"
                  >
                    Quitar adjunto
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subtareas (solo al editar) */}
          {isEditing && task && (
            <div>
              <label style={labelStyle}>Subtareas</label>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                {subtasks.map((s) => {
                  const checkboxId = `subtask-form-${task.id}-${s.id}`;
                  return (
                  <li
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "6px 10px",
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "7px",
                    }}
                  >
                    <SubtaskCheckbox
                      id={checkboxId}
                      checked={s.completed}
                      onChange={() => void handleToggleSubtask(s.id)}
                      aria-label={`Marcar "${s.title}" como completada`}
                    />
                    <label
                      htmlFor={checkboxId}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflowWrap: "break-word",
                        wordBreak: "break-word",
                        fontSize: "14px",
                        color: "var(--color-text-primary)",
                        textDecoration: s.completed ? "line-through" : "none",
                        opacity: s.completed ? 0.7 : 1,
                        cursor: "pointer",
                      }}
                    >
                      {s.title}
                    </label>
                    {deleteSubtaskFn && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteSubtask(s.id)}
                        aria-label={`Eliminar subtarea "${s.title}"`}
                        style={{
                          padding: "4px 8px",
                          border: "none",
                          background: "transparent",
                          color: "var(--color-text-muted)",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color = "var(--color-priority-high)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </li>
                  );
                })}
              </ul>
              {addSubtaskFn && (
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <input
                    ref={subtaskInputRef}
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAddSubtask(); } }}
                    placeholder="Nueva subtarea…"
                    style={{ ...inputStyle, flex: 1, padding: "7px 11px", fontSize: "14px" }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddSubtask()}
                    disabled={!newSubtaskTitle.trim()}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "7px",
                      border: "1px solid var(--color-accent)",
                      background: "var(--color-accent-subtle)",
                      color: "var(--color-accent)",
                      fontSize: "13px",
                      cursor: newSubtaskTitle.trim() ? "pointer" : "default",
                      opacity: newSubtaskTitle.trim() ? 1 : 0.5,
                    }}
                  >
                    Añadir
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p style={{ fontSize: "13px", color: "var(--color-priority-critical)" }}>
              {error}
            </p>
          )}

          {/* Botones */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "4px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 18px",
                borderRadius: "7px",
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text-secondary)",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-strong)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "8px 22px",
                borderRadius: "7px",
                border: "1px solid var(--color-accent)",
                background: "var(--color-accent-subtle)",
                color: "var(--color-accent)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.6 : 1,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  (e.currentTarget as HTMLElement).style.background = "var(--color-accent)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-surface)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--color-accent-subtle)";
                (e.currentTarget as HTMLElement).style.color = "var(--color-accent)";
              }}
            >
              {saving ? "Guardando..." : isEditing ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
