/**
 * Página principal de tareas.
 * Orquesta: barra de filtros (status + categoría), toggle lista/kanban, formulario y las vistas.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useApp } from "@app/AppContext.tsx";
import { useTaskStore } from "@/store/useTaskStore.ts";
import { useCategoryStore } from "@/store/useCategoryStore.ts";
import { useAppSettingsStore } from "@/store/useAppSettingsStore.ts";
import { TaskListView } from "./components/TaskListView.tsx";
import { KanbanView } from "./components/KanbanView.tsx";
import { TaskForm } from "./components/TaskForm.tsx";
import { TaskSearchBar, taskMatchesQuery } from "./components/TaskSearchBar.tsx";
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
    taskUndoStack,
    taskRedoStack,
    undoTaskChange,
    redoTaskChange,
    setTaskUndoStacks,
  } = useTaskStore();
  const { categories, loadCategories } = useCategoryStore();

  const [editingTask, setEditingTask] = useState<TaskDTO | null | undefined>(undefined);
  // undefined = cerrado, null = nuevo, TaskDTO = edición
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void loadTasks(uc);
    void loadCategories(uc);
    uc.loadTaskUndoSession().then((session) => {
      setTaskUndoStacks(session.undo, session.redo);
    });
  }, [uc]); // eslint-disable-line react-hooks/exhaustive-deps

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
      } else {
        await createTask(uc, input as CreateTaskInput);
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
                    onClick={() => { setView(v); }}
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

        {/* Filtros de categoría */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-[var(--color-text-muted)]">Categoría:</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {categories.map((cat) => {
                const active = filters.categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { toggleCategoryFilter(cat.id); }}
                    className="min-h-[2.75rem] shrink-0 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[0.8125rem] transition-all duration-150"
                    style={{
                      borderColor: active ? "var(--color-accent)" : "var(--color-border)",
                      background: active ? "var(--color-accent-subtle)" : "transparent",
                      color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Contenido ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {loading && tasks.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : view === "list" ? (
          <TaskListView
            tasks={filteredTasks}
            onEdit={setEditingTask}
            onComplete={(id) => { void completeTask(uc, id); }}
            onRestore={(id) => { void restoreTask(uc, id); }}
            onMoveStatus={(id, status) => { void moveTaskStatus(uc, id, status); }}
            onAddTask={() => setEditingTask(null)}
          />
        ) : (
          <KanbanView
            tasks={filteredAllTasks}
            onEdit={setEditingTask}
            onMoveStatus={(id, status) => { void moveTaskStatus(uc, id, status); }}
            onAddTask={() => setEditingTask(null)}
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
        />
      )}
    </div>
  );
}
