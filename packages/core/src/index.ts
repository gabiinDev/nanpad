/**
 * Punto de entrada público de @nanpad/core.
 * Re-exporta UseCases, DTOs, contratos e implementaciones de repositorios
 * que la capa de aplicación (apps/app) necesita.
 */

// ─── Shared Kernel ───────────────────────────────────────────────────────────
export { EventBus, createEvent } from "./shared/event-bus/EventBus";
export type {
  IEventBus,
  AppEvent,
  EventHandler,
  EventPayload,
  TaskCreatedPayload,
  TaskUpdatedPayload,
  TaskStatusChangedPayload,
  TaskCompletedPayload,
  TaskRestoredPayload,
  CategoryCreatedPayload,
  CategoryUpdatedPayload,
  CategoryDeletedPayload,
  DocumentCreatedPayload,
  DocumentUpdatedPayload,
  DocumentDeletedPayload,
} from "./shared/event-bus/types";
export { generateId, isValidId } from "./shared/types/id";
export type { EntityId } from "./shared/types/id";
export { ok, err } from "./shared/types/result";
export type { Result, Ok, Err } from "./shared/types/result";

// ─── Infraestructura (contratos) ─────────────────────────────────────────────
export type { IDatabase } from "./infrastructure/db/IDatabase";
export { runMigrations } from "./infrastructure/db/index";
export type {
  SchemaVersionRow,
  CategoryRow,
  TagRow,
  TaskRow,
  TaskCategoryRow,
  TaskTagRow,
  SubtaskRow,
  TaskCodeSnippetRow,
  DocumentRow,
  DocumentContentRow,
  HistoryEntryRow,
} from "./infrastructure/db/schema";

// ─── Módulo MCP ──────────────────────────────────────────────────────────────
export { McpServer, McpToolRegistry } from "./modules/mcp/application/index";
export type {
  McpServerDeps,
  McpRequest,
  McpResponse,
  McpToolDescriptor,
  McpToolHandler,
  McpToolEntry,
  McpParamSchema,
  McpParamType,
} from "./modules/mcp/application/index";

// ─── Módulo Storage ──────────────────────────────────────────────────────────
export {
  ExportWorkspace,
  ImportWorkspace,
  BackupNow,
} from "./modules/storage/application/index";
export type {
  WorkspaceSnapshot,
  ExportWorkspaceInput,
  ExportWorkspaceResult,
  ImportWorkspaceInput,
  ImportWorkspaceResult,
  BackupResult,
  IStoragePort,
} from "./modules/storage/application/index";

// ─── Módulo Document ─────────────────────────────────────────────────────────
export {
  CreateDocument,
  UpdateDocument,
  GetDocument,
  ListDocuments,
  DeleteDocument,
  DocumentSqliteRepository,
} from "./modules/document/application/index";
export type {
  DocumentDTO,
  DocumentWithContentDTO,
  CreateDocumentInput,
  UpdateDocumentInput,
  GetDocumentInput,
  ListDocumentsInput,
  IDocumentRepository,
} from "./modules/document/application/index";

// ─── Módulo History ──────────────────────────────────────────────────────────
export {
  RecordChange,
  GetEntityHistory,
  HistoryEventListener,
  HistorySqliteRepository,
} from "./modules/history/application/index";
export type {
  HistoryEntryDTO,
  RecordChangeInput,
  GetEntityHistoryInput,
  HistoryAction,
  IHistoryRepository,
} from "./modules/history/application/index";

// ─── Módulo Category ─────────────────────────────────────────────────────────
export {
  CreateCategory,
  UpdateCategory,
  DeleteCategory,
  ListCategories,
  CategorySqliteRepository,
} from "./modules/category/application/index";
export type {
  CategoryDTO,
  CreateCategoryInput,
  UpdateCategoryInput,
  DeleteCategoryInput,
  ListCategoriesInput,
  ICategoryRepository,
} from "./modules/category/application/index";

// ─── Módulo Task ─────────────────────────────────────────────────────────────
export {
  CreateTask,
  UpdateTask,
  ListTasks,
  MoveTaskStatus,
  CompleteTask,
  RestoreTask,
  AddSubtask,
  UpdateSubtask,
  DeleteSubtask,
  AttachCodeToTask,
  ListCodeSnippetsForTask,
  DeleteCodeSnippet,
  GetTaskHistory,
  TaskSqliteRepository,
} from "./modules/task/application/index";
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
  UpdateSubtaskInput,
  DeleteSubtaskInput,
  ITaskRepository,
} from "./modules/task/application/index";
