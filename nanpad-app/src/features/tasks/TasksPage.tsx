/**
 * Página principal de tareas.
 * Orquesta: barra de filtros (status + categoría), toggle lista/kanban, formulario y las vistas.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchFocusStore } from "@/store/useSearchFocusStore.ts";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore.ts";
import { useApp } from "@app/AppContext.tsx";
import { useTaskStore, PAGE_SIZE_OPTIONS } from "@/store/useTaskStore.ts";
import { useToastStore } from "@/store/useToastStore.ts";
import { useCategoryStore } from "@/store/useCategoryStore.ts";
import { useAppSettingsStore } from "@/store/useAppSettingsStore.ts";
import { TaskListView } from "./components/TaskListView.tsx";
import { KanbanView } from "./components/KanbanView.tsx";
import { TaskForm } from "./components/TaskForm.tsx";
import { TaskHistoryModal } from "./components/TaskHistoryModal.tsx";
import { TaskSearchBar, taskMatchesQuery, type TaskSearchBarRef } from "./components/TaskSearchBar.tsx";
import { CategoriesSection } from "./components/CategoriesSection.tsx";
import { CategoryBadge } from "@ui/components/CategoryBadge.tsx";
import { Spinner } from "@ui/components/Spinner.tsx";
import type { TaskDTO, CreateTaskInput, UpdateTaskInput } from "@nanpad/core";

const TASK_UNDO_SAVE_DEBOUNCE_MS = 500;

/** Devuelve true si el foco está en un campo editable (no disparar atajos undo/redo). */
function isEditableFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  const role = (el.getAttribute?.("role") ?? "").toLowerCase();
  const isInput = tag === "input" || tag === "textarea" || tag === "select";
  const isContentEditable = (el as HTMLElement).isContentEditable;
  const isMonaco = el.closest?.(".monaco-editor") != null;
  return isInput || isContentEditable || isMonaco || role === "textbox";
}

const STATUS_FILTERS = [
  { value: undefined, label: "Todas" },
  { value: "todo" as const, label: "Por hacer" },
  { value: "in_progress" as const, label: "En progreso" },
  { value: "done" as const, label: "Hechas" },
  { value: "archived" as const, label: "Archivadas" },
];

export default function TasksPage() {
  const uc = useApp();
  const {
    tasks,
    allTasks,
    total,
    page,
    pageSize,
    filters,
    view,
    loading,
    loadTasks,
    createTask,
    updateTask,
    completeTask,
    restoreTask,
    moveTaskStatus,
    setFilters,
    setView,
    setPage,
    setPageSize,
    taskUndoStack,
    taskRedoStack,
    replaceTask,
    undoTaskChange,
    redoTaskChange,
    setTaskUndoStacks,
  } = useTaskStore();
  const { categories, loadCategories } = useCategoryStore();

  const [editingTask, setEditingTask] = useState<TaskDTO | null | undefined>(undefined);
  const [historyTask, setHistoryTask] = useState<TaskDTO | null>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  // undefined = cerrado, null = nuevo, TaskDTO = edición
  const [searchQuery, setSearchQuery] = useState("");
  const taskSearchBarRef = useRef<TaskSearchBarRef>(null);
  const setFocusTasksSearch = useSearchFocusStore((s) => s.setFocusTasksSearch);

  useEffect(() => {
    void loadTasks(uc);
    void loadCategories(uc);
    uc.loadTaskUndoSession().then((session) => {
      setTaskUndoStacks(session.undo, session.redo);
    });
  }, [uc]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suscripción al Event Bus: refrescar lista cuando cambien tareas (crear, actualizar, eliminar, cambio de estado).
  // Así la UI se actualiza también cuando los cambios vienen de MCP u otras fuentes.
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const refresh = () => { void loadTasks(uc); };
    ["task.created", "task.updated", "task.deleted", "task.status_changed", "task.completed", "task.restored"].forEach((type) => {
      unsubs.push(uc.eventBus.on(type, refresh));
    });
    return () => { unsubs.forEach((u) => u()); };
  }, [uc, loadTasks]);

  // Registrar foco del buscador para Ctrl+U
  useEffect(() => {
    setFocusTasksSearch(() => taskSearchBarRef.current?.focus());
    return () => setFocusTasksSearch(null);
  }, [setFocusTasksSearch]);

  // Registrar "Nueva tarea" para la command palette (Ctrl+K)
  useEffect(() => {
    useCommandPaletteStore.getState().setOnOpenNewTask(() => setEditingTask(null));
    return () => useCommandPaletteStore.getState().setOnOpenNewTask(null);
  }, []);

  // Aplicar vista por defecto (lista/kanban) al entrar en Tareas
  useEffect(() => {
    useTaskStore.getState().setView(useAppSettingsStore.getState().default_task_view);
  }, []);

  const saveTaskUndoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTaskUndoRef.current) clearTimeout(saveTaskUndoRef.current);
    saveTaskUndoRef.current = setTimeout(() => {
      saveTaskUndoRef.current = null;
      void uc.saveTaskUndoSession({ undo: taskUndoStack, redo: taskRedoStack });
    }, TASK_UNDO_SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTaskUndoRef.current) clearTimeout(saveTaskUndoRef.current);
    };
  }, [uc, taskUndoStack, taskRedoStack]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "n") {
        e.preventDefault();
        setEditingTask(null);
        return;
      }
      if (e.key === "z" && !e.shiftKey) {
        if (!isEditableFocused()) {
          e.preventDefault();
          void undoTaskChange(uc);
        }
        return;
      }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        if (!isEditableFocused()) {
          e.preventDefault();
          void redoTaskChange(uc);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [uc, undoTaskChange, redoTaskChange]);

  const handleSave = useCallback(
    async (input: CreateTaskInput | UpdateTaskInput) => {
      if ("id" in input) {
        await updateTask(uc, input as UpdateTaskInput);
        useToastStore.getState().toast("Tarea actualizada");
      } else {
        await createTask(uc, input as CreateTaskInput);
        useToastStore.getState().toast("Tarea creada");
      }
    },
    [uc, createTask, updateTask]
  );

  // Tareas filtradas por búsqueda (se aplica sobre tasks ya filtradas por status/categoría)
  const filteredTasks = useMemo(
    () => tasks.filter((t) => taskMatchesQuery(t, searchQuery)),
    [tasks, searchQuery]
  );
  const filteredAllTasks = useMemo(
    () => allTasks.filter((t) => taskMatchesQuery(t, searchQuery)),
    [allTasks, searchQuery]
  );

  const handleToggleSubtask = useCallback(
    async (task: TaskDTO, subtaskId: string) => {
      const sub = task.subtasks.find((s) => s.id === subtaskId);
      if (!sub) return;
      try {
        await uc.updateSubtask.execute({ taskId: task.id, subtaskId, completed: !sub.completed });
        const updated: TaskDTO = {
          ...task,
          subtasks: task.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
          ),
        };
        replaceTask(updated);
        useToastStore.getState().toast("Subtarea actualizada");
      } catch {
        void loadTasks(uc);
      }
    },
    [uc, replaceTask, loadTasks]
  );

  const toggleCategoryFilter = useCallback(
    (catId: string) => {
      const current = filters.categoryId;
      void setFilters(uc, {
        ...filters,
        categoryId: current === catId ? undefined : catId,
      });
    },
    [uc, filters, setFilters]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Barra superior: fluid, responsive (flex-wrap en ventanas estrechas) */}
      <div className="flex shrink-0 flex-col gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 md:px-5">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {/* Filtros de estado — solo en vista lista, scroll horizontal si hace falta */}
          {view === "list" && (
            <div className="flex gap-1 overflow-x-auto">
              {STATUS_FILTERS.map((f) => {
                const active = filters.status === f.value;
                return (
                  <button
                    key={String(f.value)}
                    type="button"
                    onClick={() => { void setFilters(uc, { ...filters, status: f.value }); }}
                    className="min-h-[2.75rem] shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-[0.8125rem] transition-all duration-150"
                    style={{
                      borderColor: active ? "var(--color-accent)" : "var(--color-border)",
                      background: active ? "var(--color-accent-subtle)" : "transparent",
                      color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}
          {view === "kanban" && (
            <span className="text-[0.8125rem] text-[var(--color-text-muted)]">
              {allTasks.length} tareas en total
            </span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2 md:gap-3">
            <TaskSearchBar
              ref={taskSearchBarRef}
              query={searchQuery}
              onChange={setSearchQuery}
              resultCount={view === "list" ? filteredTasks.length : filteredAllTasks.length}
            />
            {/* Toggle vista Lista / Kanban */}
            <div className="flex gap-0.5 rounded-md border border-[var(--color-border)] p-0.5">
              {(["list", "kanban"] as const).map((v) => {
                const active = view === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setView(v); void loadTasks(uc); }}
                    className="min-h-[2.75rem] rounded px-3 py-1 text-[0.8125rem] transition-all duration-150"
                    style={{
                      background: active ? "var(--color-accent-subtle)" : "transparent",
                      color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                    }}
                  >
                    {v === "list" ? "Lista" : "Kanban"}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => { setEditingTask(null); }}
              className="flex min-h-[2.75rem] items-center gap-1.5 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition-all duration-150 hover:bg-[var(--color-accent)] hover:text-[var(--color-surface)]"
            >
              <span className="leading-none">+</span>
              Nueva tarea
            </button>
          </div>
        </div>

        {/* Filtros de categoría + gestionar */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-[var(--color-text-muted)]">Categoría:</span>
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
            {categories.map((cat) => {
                const active = filters.categoryId === cat.id;
                return (
                  <CategoryBadge
                    key={cat.id}
                    category={cat}
                    active={active}
                    colorMode="filter"
                    activeFilterId={filters.categoryId ?? null}
                    onClick={() => { toggleCategoryFilter(cat.id); }}
                  />
                );
              })}
            <button
              type="button"
              onClick={() => setShowCategoriesModal(true)}
              title="Gestionar categorías"
              className="shrink-0 rounded-md border border-dashed border-[var(--color-border)] px-2 py-1.5 text-[0.8125rem] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              + Gestionar
            </button>
          </div>
        </div>
      </div>

      {/* ─── Contenido ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {loading && tasks.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : view === "list" ? (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-hidden">
              <TaskListView
                tasks={filteredTasks}
                categories={categories}
                onEdit={setEditingTask}
                onComplete={(id) => { void completeTask(uc, id).then(() => useToastStore.getState().toast("Tarea completada")); }}
                onRestore={(id) => { void restoreTask(uc, id).then(() => useToastStore.getState().toast("Tarea restaurada")); }}
                onMoveStatus={(id, status) => { void moveTaskStatus(uc, id, status).then(() => useToastStore.getState().toast("Estado actualizado")); }}
                onAddTask={() => setEditingTask(null)}
                onShowHistory={setHistoryTask}
                onToggleSubtask={handleToggleSubtask}
              />
            </div>
            {/* Controles de paginación (solo vista lista) */}
            {total > 0 && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)]">Tamaño:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { void setPageSize(uc, Number(e.target.value)); }}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-primary)]"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Página {page} de {Math.max(1, Math.ceil(total / pageSize))}
                  </span>
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => { setPage(page - 1); void loadTasks(uc); }}
                    className="min-h-[2rem] rounded border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)] disabled:opacity-50 hover:bg-[var(--color-surface-active)]"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={page >= Math.ceil(total / pageSize) || loading}
                    onClick={() => { setPage(page + 1); void loadTasks(uc); }}
                    className="min-h-[2rem] rounded border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)] disabled:opacity-50 hover:bg-[var(--color-surface-active)]"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <KanbanView
            tasks={filteredAllTasks}
            categories={categories}
            onEdit={setEditingTask}
            onMoveStatus={(id, status) => { void moveTaskStatus(uc, id, status).then(() => useToastStore.getState().toast("Estado actualizado")); }}
            onAddTask={() => setEditingTask(null)}
            onShowHistory={setHistoryTask}
            onToggleSubtask={handleToggleSubtask}
          />
        )}
      </div>

      {/* ─── Modal formulario ─────────────────────────────────────────── */}
      {editingTask !== undefined && (
        <TaskForm
          task={editingTask}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setEditingTask(undefined); }}
          addSubtask={editingTask ? (taskId, title) => uc.addSubtask.execute({ taskId, title }) : undefined}
          updateSubtask={editingTask ? async (taskId, subtaskId, patch) => { await uc.updateSubtask.execute({ taskId, subtaskId, ...patch }); } : undefined}
          deleteSubtask={editingTask ? (taskId, subtaskId) => uc.deleteSubtask.execute({ taskId, subtaskId }) : undefined}
          onSubtaskChange={editingTask ? (updated) => setEditingTask(updated) : undefined}
          onShowHistory={editingTask ? () => setHistoryTask(editingTask) : undefined}
        />
      )}
      {/* Modal ABM de categorías */}
      {showCategoriesModal && uc && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 py-8 px-4 sm:py-10 sm:px-6"
          onClick={() => setShowCategoriesModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="categories-modal-title"
        >
          <div
            className="flex max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] w-full max-w-md flex-col rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 p-6 pb-0">
              <h2 id="categories-modal-title" className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">
                Gestionar categorías
              </h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6">
            <CategoriesSection
              uc={uc}
              categories={categories}
              loadCategories={loadCategories}
              onCloseRequest={() => setShowCategoriesModal(false)}
            />
            </div>
            <div className="shrink-0 mt-4 flex justify-end p-6 pt-4 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setShowCategoriesModal(false)}
                className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-active)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {historyTask && (
        <TaskHistoryModal
          taskId={historyTask.id}
          taskTitle={historyTask.title}
          onClose={() => setHistoryTask(null)}
        />
      )}
    </div>
  );
}
