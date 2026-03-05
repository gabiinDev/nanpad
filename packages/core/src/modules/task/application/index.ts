/**
 * API pública del módulo Task.
 * SOLO se exportan UseCases, DTOs y contratos necesarios para el exterior.
 * No exportar entidades de dominio ni implementaciones de infraestructura.
 */

// ─── UseCases ───────────────────────────────────────────────────────────────
export { CreateTask } from "./usecases/CreateTask.ts";
export { UpdateTask } from "./usecases/UpdateTask.ts";
export { ListTasks } from "./usecases/ListTasks.ts";
export { MoveTaskStatus } from "./usecases/MoveTaskStatus.ts";
export { CompleteTask } from "./usecases/CompleteTask.ts";
export { RestoreTask } from "./usecases/RestoreTask.ts";
export { AddSubtask } from "./usecases/AddSubtask.ts";
export { AttachCodeToTask } from "./usecases/AttachCodeToTask.ts";
export { GetTaskHistory } from "./usecases/GetTaskHistory.ts";

// ─── DTOs (contratos de datos) ───────────────────────────────────────────────
export type {
  TaskDTO,
  SubtaskDTO,
  CodeSnippetDTO,
  TaskFilters,
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskStatusInput,
  AddSubtaskInput,
  AttachCodeToTaskInput,
} from "./dtos/TaskDTO.ts";


// ─── Contrato del repositorio (necesario para el Composition Root) ───────────
export type { ITaskRepository } from "../infrastructure/persistence/TaskRepository.ts";

// ─── Implementación SQLite (solo para el Composition Root) ───────────────────
export { TaskSqliteRepository } from "../infrastructure/persistence/sqlite/TaskSqliteRepository.ts";
