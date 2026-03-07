/**
 * CategoriesSection — ABM de categorías para tareas.
 * Permite crear, editar y eliminar categorías.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { CategoryDTO } from "@nanpad/core";
import type { AppUseCases } from "@app/composition.ts";
import { IconClose, IconEdit, IconDelete, IconPlus, IconCheck } from "@ui/icons/index.tsx";
import { Spinner } from "@ui/components/Spinner.tsx";
import { CategoryBadge } from "@ui/components/CategoryBadge.tsx";

interface CategoriesSectionProps {
  uc: AppUseCases;
  categories: CategoryDTO[];
  loadCategories: (uc: AppUseCases) => Promise<void>;
  /** Si se proporciona, Escape cierra el modal contenedor cuando no hay edición ni confirmación. */
  onCloseRequest?: () => void;
}

/** Modal simple para confirmar eliminación. */
function ConfirmDeleteDialog({
  categoryName,
  onConfirm,
  onCancel,
}: {
  categoryName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 py-8 px-4 sm:py-10 sm:px-6"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-category-title"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] p-6 shadow-xl max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="delete-category-title" className="mb-2 text-base font-semibold text-[var(--color-text-primary)]">
          Eliminar categoría
        </h3>
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
          ¿Eliminar la categoría &quot;{categoryName}&quot;? Las tareas asignadas serán desasignadas.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-active)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg border border-[var(--color-priority-high)] bg-[var(--color-priority-high)]/15 px-3 py-1.5 text-sm font-medium text-[var(--color-priority-high)] hover:bg-[var(--color-priority-high)]/25"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Colores predefinidos para categorías. */
const CATEGORY_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#0ea5e9",
];

export function CategoriesSection({ uc, categories, loadCategories, onCloseRequest }: CategoriesSectionProps) {
  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(CATEGORY_COLORS[0]);
  const [deleteTarget, setDeleteTarget] = useState<CategoryDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    void loadCategories(uc);
  }, [uc, loadCategories]);

  useEffect(() => {
    void loadCategories(uc);
  }, [uc, loadCategories]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setError(null);
  }, [newName, editing]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editing) {
        setEditing(null);
        e.preventDefault();
        return;
      }
      if (deleteTarget) {
        setDeleteTarget(null);
        e.preventDefault();
        return;
      }
      if (onCloseRequest) {
        onCloseRequest();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editing, deleteTarget, onCloseRequest]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const exists = categories.some((c) => c.name.trim().toLowerCase() === name.toLowerCase());
    if (exists) {
      setError("Ya existe una categoría con ese nombre");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await uc.createCategory.execute({ name, color: newColor });
      setNewName("");
      setNewColor(CATEGORY_COLORS[0]);
      refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    const name = (editing as { _editName?: string })._editName ?? editing.name;
    const color = (editing as { _editColor?: string })._editColor ?? editing.color;
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = categories.some(
      (c) => c.id !== editing.id && c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setError("Ya existe una categoría con ese nombre");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await uc.updateCategory.execute({ id: editing.id, name: trimmed, color: color });
      setEditing(null);
      refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError(null);
    try {
      await uc.deleteCategory.execute({ id: deleteTarget.id, strategy: "unassign" });
      setDeleteTarget(null);
      refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const setEditName = (name: string) => {
    if (editing) setEditing({ ...editing, _editName: name } as CategoryDTO & { _editName?: string; _editColor?: string });
  };

  const setEditColor = (color: string) => {
    if (editing) setEditing({ ...editing, _editColor: color } as CategoryDTO & { _editName?: string; _editColor?: string });
  };

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
        Categorías de tareas
      </h2>
      <p className="mb-4 text-xs text-[var(--color-text-muted)]">
        Gestiona categorías para organizar tus tareas.
      </p>

      {error && (
        <p className="mb-3 rounded-lg bg-[var(--color-priority-high)]/15 px-3 py-2 text-sm text-[var(--color-priority-high)]">
          {error}
        </p>
      )}

      {/* Crear categoría */}
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreate();
            if (e.key === "Escape") setNewName("");
          }}
          placeholder="Nombre de nueva categoría"
          className="min-w-[180px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
          disabled={saving}
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={saving || !newName.trim()}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-3 py-2 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
        >
          {saving ? <Spinner className="h-3 w-3" /> : <IconPlus size={14} />}
          Crear
        </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">Color:</span>
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewColor(c)}
              title={c}
              className="h-7 w-7 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c,
                borderColor: newColor === c ? "var(--color-accent)" : "transparent",
                boxShadow: newColor === c ? "0 0 0 2px var(--color-accent)" : undefined,
              }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Lista de categorías */}
      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 px-4 py-3 text-center text-sm text-[var(--color-text-muted)]">
            No hay categorías. Crea una para empezar.
          </p>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-2.5"
            >
              {editing?.id === cat.id ? (
                (() => {
                  const currentEditColor =
                    (editing as CategoryDTO & { _editColor?: string })._editColor ??
                    editing.color ??
                    CATEGORY_COLORS[0];
                  return (
                    <>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={(editing as CategoryDTO & { _editName?: string })._editName ?? editing.name}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleUpdate();
                              if (e.key === "Escape") setEditing(null);
                            }}
                            className="min-w-0 flex-1 rounded border border-[var(--color-accent)] bg-[var(--color-surface)] px-2 py-1 text-sm outline-none"
                            autoFocus
                          />
                          <span
                            className="shrink-0 rounded px-2 py-0.5 text-xs font-medium"
                            style={{
                              color: currentEditColor,
                              background: `color-mix(in oklch, ${currentEditColor} 15%, transparent)`,
                              border: `1px solid color-mix(in oklch, ${currentEditColor} 40%, transparent)`,
                            }}
                          >
                            {(editing as CategoryDTO & { _editName?: string })._editName ?? editing.name ?? "Nueva"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {CATEGORY_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditColor(c)}
                              title={c}
                              className="h-5 w-5 shrink-0 rounded-full border transition-all"
                              style={{
                                backgroundColor: c,
                                borderColor: currentEditColor === c ? "var(--color-accent)" : "transparent",
                                boxShadow: currentEditColor === c ? "0 0 0 2px var(--color-accent)" : undefined,
                              }}
                              aria-label={`Color ${c}`}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleUpdate()}
                        disabled={saving}
                        className="rounded p-1.5 text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] disabled:opacity-50"
                        title="Guardar"
                      >
                        <IconCheck size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        disabled={saving}
                        className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-active)]"
                        title="Cancelar"
                      >
                        <IconClose size={14} />
                      </button>
                    </>
                  );
                })()
              ) : (
                <>
                  <span className="flex-1">
                    <CategoryBadge category={cat} colorMode="always" compact />
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(cat)}
                    className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-active)] hover:text-[var(--color-text-primary)]"
                    title="Editar"
                  >
                    <IconEdit size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(cat)}
                    className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-priority-high)]/15 hover:text-[var(--color-priority-high)]"
                    title="Eliminar"
                  >
                    <IconDelete size={14} />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {deleteTarget && (
        <ConfirmDeleteDialog
          categoryName={deleteTarget.name}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}
