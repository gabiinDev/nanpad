/**
 * API pública del módulo Task.
 * SOLO se exportan UseCases, DTOs y contratos necesarios para el exterior.
 * No exportar entidades de dominio ni implementaciones de infraestructura.
 */

// ─── UseCases ───────────────────────────────────────────────────────────────
export { CreateTask } from "./usecases/CreateTask";
export { UpdateTask } from "./usecases/UpdateTask";
export { ListTasks } from "./usecases/ListTasks";
export { MoveTaskStatus } from "./usecases/MoveTaskStatus";
export { CompleteTask } from "./usecases/CompleteTask";
export { RestoreTask } from "./usecases/RestoreTask";
export { AddSubtask } from "./usecases/AddSubtask";
export { UpdateSubtask } from "./usecases/UpdateSubtask";
export { DeleteSubtask } from "./usecases/DeleteSubtask";
export { AttachCodeToTask } from "./usecases/AttachCodeToTask";
export { ListCodeSnippetsForTask } from "./usecases/ListCodeSnippetsForTask";
export { DeleteCodeSnippet } from "./usecases/DeleteCodeSnippet";
export { GetTaskHistory } from "./usecases/GetTaskHistory";

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
} from "./dtos/TaskDTO";
export type { UpdateSubtaskInput } from "./usecases/UpdateSubtask";
export type { DeleteSubtaskInput } from "./usecases/DeleteSubtask";


// ─── Contrato del repositorio (necesario para el Composition Root) ───────────
export type { ITaskRepository } from "../infrastructure/persistence/TaskRepository";

// ─── Implementación SQLite (solo para el Composition Root) ───────────────────
export { TaskSqliteRepository } from "../infrastructure/persistence/sqlite/TaskSqliteRepository";
