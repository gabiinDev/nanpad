/**
 * Punto de entrada público de @nanpad/core.
 * Re-exporta UseCases, DTOs, contratos e implementaciones de repositorios
 * que la capa de aplicación (apps/app) necesita.
 */

// ─── Shared Kernel ───────────────────────────────────────────────────────────
export { EventBus, createEvent } from "./shared/event-bus/EventBus.ts";
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
} from "./shared/event-bus/types.ts";
export { generateId, isValidId } from "./shared/types/id.ts";
export type { EntityId } from "./shared/types/id.ts";
export { ok, err } from "./shared/types/result.ts";
export type { Result, Ok, Err } from "./shared/types/result.ts";

// ─── Infraestructura (contratos) ─────────────────────────────────────────────
export type { IDatabase } from "./infrastructure/db/IDatabase.ts";
export { runMigrations } from "./infrastructure/db/index.ts";
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
} from "./infrastructure/db/schema.ts";

// ─── Módulo MCP ──────────────────────────────────────────────────────────────
export { McpServer, McpToolRegistry } from "./modules/mcp/application/index.ts";
export type {
  McpServerDeps,
  McpRequest,
  McpResponse,
  McpToolDescriptor,
  McpToolHandler,
  McpToolEntry,
  McpParamSchema,
  McpParamType,
} from "./modules/mcp/application/index.ts";

// ─── Módulo Storage ──────────────────────────────────────────────────────────
export {
  ExportWorkspace,
  ImportWorkspace,
  BackupNow,
} from "./modules/storage/application/index.ts";
export type {
  WorkspaceSnapshot,
  ExportWorkspaceInput,
  ExportWorkspaceResult,
  ImportWorkspaceInput,
  ImportWorkspaceResult,
  BackupResult,
  IStoragePort,
} from "./modules/storage/application/index.ts";

// ─── Módulo Document ─────────────────────────────────────────────────────────
export {
  CreateDocument,
  UpdateDocument,
  GetDocument,
  ListDocuments,
  DeleteDocument,
  DocumentSqliteRepository,
} from "./modules/document/application/index.ts";
export type {
  DocumentDTO,
  DocumentWithContentDTO,
  CreateDocumentInput,
  UpdateDocumentInput,
  GetDocumentInput,
  ListDocumentsInput,
  IDocumentRepository,
} from "./modules/document/application/index.ts";

// ─── Módulo History ──────────────────────────────────────────────────────────
export {
  RecordChange,
  GetEntityHistory,
  HistoryEventListener,
  HistorySqliteRepository,
} from "./modules/history/application/index.ts";
export type {
  HistoryEntryDTO,
  RecordChangeInput,
  GetEntityHistoryInput,
  HistoryAction,
  IHistoryRepository,
} from "./modules/history/application/index.ts";

// ─── Módulo Category ─────────────────────────────────────────────────────────
export {
  CreateCategory,
  UpdateCategory,
  DeleteCategory,
  ListCategories,
  CategorySqliteRepository,
} from "./modules/category/application/index.ts";
export type {
  CategoryDTO,
  CreateCategoryInput,
  UpdateCategoryInput,
  DeleteCategoryInput,
  ListCategoriesInput,
  ICategoryRepository,
} from "./modules/category/application/index.ts";

// ─── Módulo Task ─────────────────────────────────────────────────────────────
export {
  CreateTask,
  UpdateTask,
  ListTasks,
  MoveTaskStatus,
  CompleteTask,
  RestoreTask,
  AddSubtask,
  AttachCodeToTask,
  GetTaskHistory,
  TaskSqliteRepository,
} from "./modules/task/application/index.ts";
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
  ITaskRepository,
} from "./modules/task/application/index.ts";
