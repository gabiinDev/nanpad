/**
 * Store de tareas con Zustand.
 * Mantiene la lista de tareas, los filtros activos y el modo de vista.
 * Los UseCases se reciben como parámetro en las acciones para no romper
 * la regla de no-singleton (el store no importa el contexto directamente).
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

interface TaskStore {
  // ─── Estado ───────────────────────────────────────────────────────────────
  /** Tareas filtradas por los filtros activos. Usar en vista lista. */
  tasks: TaskDTO[];
  /** Todas las tareas sin filtro de status. Usar en vista Kanban. */
  allTasks: TaskDTO[];
  filters: TaskFilters;
  view: TaskView;
  loading: boolean;
  error: string | null;

  // ─── Acciones ─────────────────────────────────────────────────────────────

  /** Carga las tareas: filtradas en `tasks` y todas en `allTasks`. */
  loadTasks: (uc: AppUseCases) => Promise<void>;

  /** Crea una tarea y recarga la lista. */
  createTask: (uc: AppUseCases, input: CreateTaskInput) => Promise<TaskDTO>;

  /** Actualiza una tarea y recarga la lista. */
  updateTask: (uc: AppUseCases, input: UpdateTaskInput) => Promise<void>;

  /** Completa una tarea y recarga. */
  completeTask: (uc: AppUseCases, taskId: string) => Promise<void>;

  /** Restaura una tarea y recarga. */
  restoreTask: (uc: AppUseCases, taskId: string) => Promise<void>;

  /** Mueve una tarea a otro status y recarga. */
  moveTaskStatus: (
    uc: AppUseCases,
    taskId: string,
    newStatus: TaskDTO["status"]
  ) => Promise<void>;

  /** Actualiza los filtros y recarga la lista. */
  setFilters: (uc: AppUseCases, filters: TaskFilters) => Promise<void>;

  /** Cambia entre vista lista y kanban. */
  setView: (view: TaskView) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  allTasks: [],
  filters: {},
  view: "kanban",
  loading: false,
  error: null,

  loadTasks: async (uc) => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      // Carga en paralelo: tareas filtradas (lista) y todas las tareas (kanban)
      const [tasks, allTasks] = await Promise.all([
        uc.listTasks.execute(filters),
        // Para el kanban siempre necesitamos todas, sin filtro de status
        filters.status !== undefined
          ? uc.listTasks.execute({ ...filters, status: undefined })
          : Promise.resolve([] as TaskDTO[]),
      ]);
      // Si no hay filtro de status activo, tasks y allTasks son el mismo resultado
      set({ tasks, allTasks: filters.status !== undefined ? allTasks : tasks, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createTask: async (uc, input) => {
    const task = await uc.createTask.execute(input);
    await get().loadTasks(uc);
    return task;
  },

  updateTask: async (uc, input) => {
    await uc.updateTask.execute(input);
    await get().loadTasks(uc);
  },

  completeTask: async (uc, taskId) => {
    await uc.completeTask.execute(taskId);
    await get().loadTasks(uc);
  },

  restoreTask: async (uc, taskId) => {
    await uc.restoreTask.execute(taskId);
    await get().loadTasks(uc);
  },

  moveTaskStatus: async (uc, taskId, newStatus) => {
    await uc.moveTaskStatus.execute({ id: taskId, newStatus });
    await get().loadTasks(uc);
  },

  setFilters: async (uc, filters) => {
    set({ filters });
    await get().loadTasks(uc);
  },

  setView: (view) => { set({ view }); },
}));
