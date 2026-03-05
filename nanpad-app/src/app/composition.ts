/**
 * Composition Root de NANPAD.
 * Instancia EventBus, repositorios y UseCases e inyecta dependencias.
 * Se llama UNA sola vez desde App.tsx tras abrir la DB.
 */

import {
  EventBus,
  // Shared
  type IDatabase,
  // Task
  TaskSqliteRepository,
  CreateTask,
  UpdateTask,
  ListTasks,
  MoveTaskStatus,
  CompleteTask,
  RestoreTask,
  AddSubtask,
  AttachCodeToTask,
  GetTaskHistory,
  // Category
  CategorySqliteRepository,
  CreateCategory,
  UpdateCategory,
  DeleteCategory,
  ListCategories,
  // History
  HistorySqliteRepository,
  RecordChange,
  GetEntityHistory,
  HistoryEventListener,
  // Document
  DocumentSqliteRepository,
  CreateDocument,
  UpdateDocument,
  GetDocument,
  ListDocuments,
  DeleteDocument,
  // MCP
  McpServer,
  // Storage
  ExportWorkspace,
  ImportWorkspace,
  BackupNow,
} from "@nanpad/core";
import { SqliteStorageAdapter } from "@/infrastructure/SqliteStorageAdapter.ts";

/** Conjunto de todos los UseCases disponibles en la app. */
export interface AppUseCases {
  // Task
  createTask: CreateTask;
  updateTask: UpdateTask;
  listTasks: ListTasks;
  moveTaskStatus: MoveTaskStatus;
  completeTask: CompleteTask;
  restoreTask: RestoreTask;
  addSubtask: AddSubtask;
  attachCodeToTask: AttachCodeToTask;
  getTaskHistory: GetTaskHistory;
  // Category
  createCategory: CreateCategory;
  updateCategory: UpdateCategory;
  deleteCategory: DeleteCategory;
  listCategories: ListCategories;
  // History
  recordChange: RecordChange;
  getEntityHistory: GetEntityHistory;
  // Document
  createDocument: CreateDocument;
  updateDocument: UpdateDocument;
  getDocument: GetDocument;
  listDocuments: ListDocuments;
  deleteDocument: DeleteDocument;
  // MCP
  mcpServer: McpServer;
  // Storage
  exportWorkspace: ExportWorkspace;
  importWorkspace: ImportWorkspace;
  backupNow: BackupNow;
}

/**
 * Construye el grafo completo de dependencias y retorna los UseCases listos.
 * @param db - Conexión SQLite ya abierta y migrada.
 */
export function buildComposition(db: IDatabase): AppUseCases {
  // ─── Event Bus ──────────────────────────────────────────────────────────────
  const eventBus = new EventBus();

  // ─── Repositorios ────────────────────────────────────────────────────────────
  const taskRepository = new TaskSqliteRepository(db);
  const categoryRepository = new CategorySqliteRepository(db);
  const historyRepository = new HistorySqliteRepository(db);
  const documentRepository = new DocumentSqliteRepository(db);

  // ─── UseCases de Task ────────────────────────────────────────────────────────
  const createTask = new CreateTask(taskRepository, eventBus);
  const updateTask = new UpdateTask(taskRepository, eventBus);
  const listTasks = new ListTasks(taskRepository);
  const moveTaskStatus = new MoveTaskStatus(taskRepository, eventBus);
  const completeTask = new CompleteTask(taskRepository, eventBus);
  const restoreTask = new RestoreTask(taskRepository, eventBus);
  const addSubtask = new AddSubtask(taskRepository);
  const attachCodeToTask = new AttachCodeToTask(taskRepository);
  const getTaskHistory = new GetTaskHistory(historyRepository);

  // ─── UseCases de Category ────────────────────────────────────────────────────
  const createCategory = new CreateCategory(categoryRepository, eventBus);
  const updateCategory = new UpdateCategory(categoryRepository, eventBus);
  const deleteCategory = new DeleteCategory(categoryRepository, eventBus);
  const listCategories = new ListCategories(categoryRepository);

  // ─── UseCases de History ────────────────────────────────────────────────────
  const recordChange = new RecordChange(historyRepository);
  const getEntityHistory = new GetEntityHistory(historyRepository);

  // ─── Listener de eventos → historial ────────────────────────────────────────
  // Se suscribe al EventBus y registra automáticamente los cambios.
  new HistoryEventListener(historyRepository, eventBus).subscribe();

  // ─── UseCases de Document ────────────────────────────────────────────────────
  const createDocument = new CreateDocument(documentRepository, eventBus);
  const updateDocument = new UpdateDocument(documentRepository, eventBus);
  const getDocument = new GetDocument(documentRepository);
  const listDocuments = new ListDocuments(documentRepository);
  const deleteDocument = new DeleteDocument(documentRepository, eventBus);

  // ─── Storage (Export / Import / Backup) ─────────────────────────────────────
  const storageAdapter = new SqliteStorageAdapter(db);
  const exportWorkspace = new ExportWorkspace(storageAdapter);
  const importWorkspace = new ImportWorkspace(storageAdapter);
  const backupNow = new BackupNow(storageAdapter);

  // ─── MCP Server ──────────────────────────────────────────────────────────────
  const mcpServer = new McpServer({
    createTask,
    completeTask,
    listTasks,
    moveTaskStatus,
    updateTask,
    createDocument,
    getDocument,
    listDocuments,
    listCategories,
  });

  return {
    createTask,
    updateTask,
    listTasks,
    moveTaskStatus,
    completeTask,
    restoreTask,
    addSubtask,
    attachCodeToTask,
    getTaskHistory,
    createCategory,
    updateCategory,
    deleteCategory,
    listCategories,
    recordChange,
    getEntityHistory,
    createDocument,
    updateDocument,
    getDocument,
    listDocuments,
    deleteDocument,
    mcpServer,
    exportWorkspace,
    importWorkspace,
    backupNow,
  };
}
