/**
 * Drawer lateral derecho para ABM de tareas.
 * Muestra el formulario de tarea y, en edición, pestaña "Historial" en el mismo drawer.
 * Se renderiza en un portal (document.body) para que solo el panel se anime y el fondo de la página no.
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { TaskDTO, CategoryDTO, CreateTaskInput, UpdateTaskInput, SubtaskDTO } from "@nanpad/core";
import { IconClose } from "@ui/icons/index.tsx";
import { TaskForm } from "./TaskForm.tsx";
import { TaskHistoryContent } from "./TaskHistoryContent.tsx";

export type TaskDrawerTab = "task" | "history";

interface TaskDrawerProps {
  /** undefined = cerrado, null = nueva tarea, TaskDTO = editar. */
  task: TaskDTO | null | undefined;
  categories: CategoryDTO[];
  onClose: () => void;
  onSave: (input: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  /** Pestaña a mostrar al abrir (solo aplica al editar una tarea existente). */
  initialTab?: TaskDrawerTab;
  addSubtask?: (taskId: string, title: string) => Promise<SubtaskDTO>;
  updateSubtask?: (taskId: string, subtaskId: string, patch: { title?: string; completed?: boolean }) => Promise<void>;
  deleteSubtask?: (taskId: string, subtaskId: string) => Promise<void>;
  onSubtaskChange?: (updatedTask: TaskDTO) => void;
}

export function TaskDrawer({
  task,
  categories,
  onClose,
  onSave,
  initialTab = "task",
  addSubtask,
  updateSubtask,
  deleteSubtask,
  onSubtaskChange,
}: TaskDrawerProps) {
  const isOpen = task !== undefined;
  const isEditing = task != null && "id" in task;
  const showTabs = isEditing;

  const [activeTab, setActiveTab] = useState<TaskDrawerTab>(initialTab);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(showTabs ? initialTab : "task");
  }, [isOpen, showTabs, initialTab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!isOpen) return null;

  const title = task == null ? "Nueva tarea" : "Editar tarea";
  const taskForHistory = task && "id" in task ? task : null;

  const drawerContent = (
    <>
      {/* Overlay sin animación de transform: solo opacidad para no afectar el fondo de la página */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        style={{ animation: "none" }}
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />
      {/* Solo este panel tiene animación de entrada; al estar en portal no afecta al resto del DOM */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--color-border-strong)] bg-[var(--color-surface-2)] shadow-[var(--shadow-xl)] animate-drawer-in"
        style={{ willChange: "transform" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-drawer-title"
      >
        {/* Header: título + pestañas (si edición) + cerrar */}
        <div className="flex shrink-0 flex-col border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <h2
              id="task-drawer-title"
              className="truncate text-base font-semibold text-[var(--color-text-primary)]"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-active)] hover:text-[var(--color-text-primary)]"
            >
              <IconClose size={18} />
            </button>
          </div>
          {showTabs && (
            <div className="flex gap-0 px-2 pb-0">
              <button
                type="button"
                onClick={() => setActiveTab("task")}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "task"
                    ? "bg-[var(--color-surface-2)] text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
                aria-selected={activeTab === "task"}
                role="tab"
                aria-controls="task-drawer-panel"
                id="task-drawer-tab-task"
              >
                Tarea
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "history"
                    ? "bg-[var(--color-surface-2)] text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
                aria-selected={activeTab === "history"}
                role="tab"
                aria-controls="task-drawer-panel"
                id="task-drawer-tab-history"
              >
                Historial
              </button>
            </div>
          )}
        </div>

        {/* Contenido */}
        <div
          id="task-drawer-panel"
          className="min-h-0 flex-1 overflow-y-auto"
          role="tabpanel"
          aria-labelledby={activeTab === "task" ? "task-drawer-tab-task" : "task-drawer-tab-history"}
        >
          {activeTab === "task" && (
            <TaskForm
              task={task ?? undefined}
              categories={categories}
              onSave={onSave}
              onClose={onClose}
              wrapper="none"
              addSubtask={addSubtask}
              updateSubtask={updateSubtask}
              deleteSubtask={deleteSubtask}
              onSubtaskChange={onSubtaskChange}
            />
          )}
          {activeTab === "history" && taskForHistory && (
            <div className="px-4 py-3">
              <TaskHistoryContent
                taskId={taskForHistory.id}
                taskTitle={taskForHistory.title}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
}
