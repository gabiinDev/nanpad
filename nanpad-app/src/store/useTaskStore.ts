/**
 * Store de tareas con Zustand.
 * Mantiene la lista de tareas, los filtros activos y el modo de vista.
 * Incluye undo/redo de cambios (máx. 5 pasos, encolado) para lista y Kanban.
 */

import { create } from "zustand";
import type {
  TaskDTO,
  TaskFilters,
  CreateTaskInput,
  UpdateTaskInput,
} from "@nanpad/core";
import type { AppUseCases } from "@app/composition.ts";

export type TaskView = "list" | "kanban";

const MAX_TASK_UNDO_STEPS = 5;

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

interface TaskStore {
  // ─── Estado ───────────────────────────────────────────────────────────────
  tasks: TaskDTO[];
  allTasks: TaskDTO[];
  /** Total de tareas que cumplen el filtro (para paginación en vista lista). */
  total: number;
  /** Página actual (1-based) en vista lista. */
  page: number;
  pageSize: number;
  filters: TaskFilters;
  view: TaskView;
  loading: boolean;
  error: string | null;
  /** Pila de estados anteriores (encolado: máx. 5). */
  taskUndoStack: TaskDTO[];
  taskRedoStack: TaskDTO[];

  // ─── Acciones ─────────────────────────────────────────────────────────────

  loadTasks: (uc: AppUseCases) => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (uc: AppUseCases, size: number) => Promise<void>;
  createTask: (uc: AppUseCases, input: CreateTaskInput) => Promise<TaskDTO>;
  updateTask: (uc: AppUseCases, input: UpdateTaskInput) => Promise<void>;
  completeTask: (uc: AppUseCases, taskId: string) => Promise<void>;
  restoreTask: (uc: AppUseCases, taskId: string) => Promise<void>;
  moveTaskStatus: (
    uc: AppUseCases,
    taskId: string,
    newStatus: TaskDTO["status"]
  ) => Promise<void>;
  setFilters: (uc: AppUseCases, filters: TaskFilters) => Promise<void>;
  setView: (view: TaskView) => void;

  /** Reemplaza una tarea en el store (p. ej. tras toggle de subtarea sin refetch). */
  replaceTask: (task: TaskDTO) => void;
  /** Deshace el último cambio de tarea (Ctrl+Z). */
  undoTaskChange: (uc: AppUseCases) => Promise<boolean>;
  /** Rehace el último cambio deshecho (Ctrl+Y). */
  redoTaskChange: (uc: AppUseCases) => Promise<boolean>;
  /** Hidrata las pilas desde la sesión persistida. */
  setTaskUndoStacks: (undo: TaskDTO[], redo: TaskDTO[]) => void;
}

/** Copia superficial de un TaskDTO para guardar en la pila (evitar referencias). */
function snapshotTask(dto: TaskDTO): TaskDTO {
  return {
    ...dto,
    categoryIds: [...dto.categoryIds],
    tagIds: [...dto.tagIds],
    subtasks: dto.subtasks.map((s) => ({ ...s })),
  };
}

/** Construye UpdateTaskInput desde un TaskDTO (sin status; status se aplica con moveTaskStatus). */
function taskDTOToUpdateInput(dto: TaskDTO): UpdateTaskInput {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    priority: dto.priority,
    categoryIds: dto.categoryIds,
    tagIds: dto.tagIds,
    sortOrder: dto.sortOrder,
    documentId: dto.documentId,
  };
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  allTasks: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  filters: {},
  view: "kanban",
  loading: false,
  error: null,
  taskUndoStack: [],
  taskRedoStack: [],

  loadTasks: async (uc) => {
    set({ loading: true, error: null });
    try {
      const { filters, view, page, pageSize } = get();
      if (view === "list") {
        const result = await uc.listTasks.execute({
          filters,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        set({
          tasks: result.tasks,
          allTasks: result.tasks,
          total: result.total,
          loading: false,
        });
      } else {
        // Kanban: cargar todas las tareas sin paginación
        const result = await uc.listTasks.execute({ filters });
        set({
          tasks: result.tasks,
          allTasks: result.tasks,
          total: result.total,
          loading: false,
        });
      }
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  setPage: (page) => set({ page }),

  setPageSize: async (uc, size) => {
    set({ pageSize: size, page: 1 });
    await get().loadTasks(uc);
  },

  createTask: async (uc, input) => {
    const task = await uc.createTask.execute(input);
    // La lista se actualiza vía Event Bus (task.created) en TasksPage.
    return task;
  },

  updateTask: async (uc, input) => {
    const { tasks, allTasks, taskUndoStack } = get();
    const task = tasks.find((t) => t.id === input.id) ?? allTasks.find((t) => t.id === input.id);
    if (task) {
      set({
        taskUndoStack: [...taskUndoStack, snapshotTask(task)].slice(-MAX_TASK_UNDO_STEPS),
        taskRedoStack: [],
      });
    }
    await uc.updateTask.execute(input);
    // La lista se actualiza vía Event Bus (task.updated) en TasksPage.
  },

  completeTask: async (uc, taskId) => {
    const { tasks, allTasks, taskUndoStack } = get();
    const task = tasks.find((t) => t.id === taskId) ?? allTasks.find((t) => t.id === taskId);
    if (task) {
      set({
        taskUndoStack: [...taskUndoStack, snapshotTask(task)].slice(-MAX_TASK_UNDO_STEPS),
        taskRedoStack: [],
      });
    }
    await uc.completeTask.execute(taskId);
    // La lista se actualiza vía Event Bus (task.completed) en TasksPage.
  },

  restoreTask: async (uc, taskId) => {
    const { tasks, allTasks, taskUndoStack } = get();
    const task = tasks.find((t) => t.id === taskId) ?? allTasks.find((t) => t.id === taskId);
    if (task) {
      set({
        taskUndoStack: [...taskUndoStack, snapshotTask(task)].slice(-MAX_TASK_UNDO_STEPS),
        taskRedoStack: [],
      });
    }
    await uc.restoreTask.execute(taskId);
    // La lista se actualiza vía Event Bus (task.restored) en TasksPage.
  },

  moveTaskStatus: async (uc, taskId, newStatus) => {
    const { tasks, allTasks, taskUndoStack } = get();
    const task = tasks.find((t) => t.id === taskId) ?? allTasks.find((t) => t.id === taskId);
    if (task) {
      set({
        taskUndoStack: [...taskUndoStack, snapshotTask(task)].slice(-MAX_TASK_UNDO_STEPS),
        taskRedoStack: [],
      });
    }
    await uc.moveTaskStatus.execute({ id: taskId, newStatus });
    // La lista se actualiza vía Event Bus (task.status_changed) en TasksPage.
  },

  setFilters: async (uc, filters) => {
    set({ filters, page: 1 });
    await get().loadTasks(uc);
  },

  setView: (view) => { set({ view }); },

  replaceTask: (task) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
      allTasks: state.allTasks.map((t) => (t.id === task.id ? task : t)),
    }));
  },

  setTaskUndoStacks: (undo, redo) => {
    set({ taskUndoStack: undo, taskRedoStack: redo });
  },

  undoTaskChange: async (uc) => {
    const { taskUndoStack, taskRedoStack, tasks, allTasks } = get();
    const previous = taskUndoStack[taskUndoStack.length - 1];
    if (!previous) return false;
    const current = tasks.find((t) => t.id === previous.id) ?? allTasks.find((t) => t.id === previous.id);
    if (!current) {
      set({ taskUndoStack: taskUndoStack.slice(0, -1) });
      await get().loadTasks(uc);
      return true;
    }
    set({
      taskUndoStack: taskUndoStack.slice(0, -1),
      taskRedoStack: [...taskRedoStack, snapshotTask(current)].slice(-MAX_TASK_UNDO_STEPS),
    });
    await uc.updateTask.execute(taskDTOToUpdateInput(previous));
    if (previous.status !== current.status) {
      await uc.moveTaskStatus.execute({ id: previous.id, newStatus: previous.status });
    }
    await get().loadTasks(uc);
    return true;
  },

  redoTaskChange: async (uc) => {
    const { taskUndoStack, taskRedoStack, tasks, allTasks } = get();
    const next = taskRedoStack[taskRedoStack.length - 1];
    if (!next) return false;
    const current = tasks.find((t) => t.id === next.id) ?? allTasks.find((t) => t.id === next.id);
    if (!current) {
      set({ taskRedoStack: taskRedoStack.slice(0, -1) });
      await get().loadTasks(uc);
      return true;
    }
    set({
      taskRedoStack: taskRedoStack.slice(0, -1),
      taskUndoStack: [...taskUndoStack, snapshotTask(current)].slice(-MAX_TASK_UNDO_STEPS),
    });
    await uc.updateTask.execute(taskDTOToUpdateInput(next));
    if (next.status !== current.status) {
      await uc.moveTaskStatus.execute({ id: next.id, newStatus: next.status });
    }
    await get().loadTasks(uc);
    return true;
  },
}));
