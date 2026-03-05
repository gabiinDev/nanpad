/**
 * Página principal de tareas.
 * Orquesta: barra de filtros (status + categoría), toggle lista/kanban, formulario y las vistas.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useApp } from "@app/AppContext.tsx";
import { useTaskStore } from "@/store/useTaskStore.ts";
import { useCategoryStore } from "@/store/useCategoryStore.ts";
import { TaskListView } from "./components/TaskListView.tsx";
import { KanbanView } from "./components/KanbanView.tsx";
import { TaskForm } from "./components/TaskForm.tsx";
import { TaskSearchBar, taskMatchesQuery } from "./components/TaskSearchBar.tsx";
import { Spinner } from "@ui/components/Spinner.tsx";
import type { TaskDTO, CreateTaskInput, UpdateTaskInput } from "@nanpad/core";

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
  } = useTaskStore();
  const { categories, loadCategories } = useCategoryStore();

  const [editingTask, setEditingTask] = useState<TaskDTO | null | undefined>(undefined);
  // undefined = cerrado, null = nuevo, TaskDTO = edición
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void loadTasks(uc);
    void loadCategories(uc);
  }, [uc]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setEditingTask(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
      {/* ─── Barra superior ────────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface-2)",
          padding: "8px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Filtros de estado — solo en vista lista */}
          {view === "list" && (
            <div style={{ display: "flex", gap: "4px", overflowX: "auto" }}>
              {STATUS_FILTERS.map((f) => {
                const active = filters.status === f.value;
                return (
                  <button
                    key={String(f.value)}
                    onClick={() => { void setFilters(uc, { ...filters, status: f.value }); }}
                    style={{
                      whiteSpace: "nowrap",
                      borderRadius: "6px",
                      padding: "5px 12px",
                      fontSize: "13px",
                      border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                      background: active ? "var(--color-accent-subtle)" : "transparent",
                      color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}
          {/* En kanban: indicador */}
          {view === "kanban" && (
            <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
              {allTasks.length} tareas en total
            </span>
          )}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Buscador de tareas */}
            <TaskSearchBar
              query={searchQuery}
              onChange={setSearchQuery}
              resultCount={view === "list" ? filteredTasks.length : filteredAllTasks.length}
            />
            {/* Toggle vista */}
            <div
              style={{
                display: "flex",
                gap: "2px",
                borderRadius: "6px",
                border: "1px solid var(--color-border)",
                padding: "2px",
              }}
            >
              {(["list", "kanban"] as const).map((v) => {
                const active = view === v;
                return (
                  <button
                    key={v}
                    onClick={() => { setView(v); }}
                    style={{
                      borderRadius: "5px",
                      padding: "4px 12px",
                      fontSize: "13px",
                      border: "none",
                      background: active ? "var(--color-accent-subtle)" : "transparent",
                      color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                    }}
                  >
                    {v === "list" ? "Lista" : "Kanban"}
                  </button>
                );
              })}
            </div>

            {/* Botón nueva tarea */}
            <button
              onClick={() => { setEditingTask(null); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                borderRadius: "7px",
                padding: "6px 16px",
                fontSize: "14px",
                fontWeight: 600,
                border: "1px solid var(--color-accent)",
                background: "var(--color-accent-subtle)",
                color: "var(--color-accent)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--color-accent)";
                el.style.color = "var(--color-surface)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--color-accent-subtle)";
                el.style.color = "var(--color-accent)";
              }}
            >
              <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span>
              Nueva tarea
            </button>
          </div>
        </div>

        {/* Filtros de categoría */}
        {categories.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)", flexShrink: 0 }}>
              Categoría:
            </span>
            <div style={{ display: "flex", gap: "5px", overflowX: "auto" }}>
              {categories.map((cat) => {
                const active = filters.categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { toggleCategoryFilter(cat.id); }}
                    style={{
                      whiteSpace: "nowrap",
                      borderRadius: "5px",
                      padding: "3px 10px",
                      fontSize: "13px",
                      border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                      background: active ? "var(--color-accent-subtle)" : "transparent",
                      color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
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
