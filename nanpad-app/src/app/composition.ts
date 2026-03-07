/**
 * Composition Root de NANPAD.
 * Instancia EventBus, repositorios y UseCases e inyecta dependencias.
 * Se llama UNA sola vez desde App.tsx tras abrir la DB.
 */

import {
  EventBus,
  type IEventBus,
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
  UpdateSubtask,
  DeleteSubtask,
  AttachCodeToTask,
  ListCodeSnippetsForTask,
  DeleteCodeSnippet,
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
  // Settings
  GetAppSettings,
  SaveAppSetting,
  AppSettingsSqliteRepository,
} from "@nanpad/core";
import type { AppSettingsDTO, AppSettingsKey } from "@nanpad/core";
import { SqliteStorageAdapter } from "@/infrastructure/SqliteStorageAdapter.ts";
import {
  loadExplorerSessionFromDb,
  saveExplorerSessionToDb,
  type PersistedExplorerSession,
} from "@/infrastructure/explorerSessionPersistence.ts";
import {
  loadTaskUndoSessionFromDb,
  saveTaskUndoSessionToDb,
  type TaskUndoSession,
} from "@/infrastructure/taskUndoPersistence.ts";

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
  updateSubtask: UpdateSubtask;
  deleteSubtask: DeleteSubtask;
  attachCodeToTask: AttachCodeToTask;
  listCodeSnippetsForTask: ListCodeSnippetsForTask;
  deleteCodeSnippet: DeleteCodeSnippet;
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
  // Explorador: sesión en SQLite (tabs reales + activo)
  loadExplorerSession: () => Promise<PersistedExplorerSession | null>;
  saveExplorerSession: (session: PersistedExplorerSession) => Promise<void>;
  // Tareas: pilas undo/redo (tope 5)
  loadTaskUndoSession: () => Promise<TaskUndoSession>;
  saveTaskUndoSession: (session: TaskUndoSession) => Promise<void>;
  // Preferencias de app (tema, ayuda, vista por defecto tareas) — UseCases del módulo Settings
  loadAppSettings: () => Promise<AppSettingsDTO>;
  saveAppSetting: (key: AppSettingsKey, value: string | boolean) => Promise<void>;
  /** Event Bus para suscripciones desde la UI (p. ej. refrescar lista al crear/actualizar tarea). */
  eventBus: IEventBus;
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
  const updateSubtask = new UpdateSubtask(taskRepository);
  const deleteSubtask = new DeleteSubtask(taskRepository);
  const attachCodeToTask = new AttachCodeToTask(taskRepository);
  const listCodeSnippetsForTask = new ListCodeSnippetsForTask(taskRepository);
  const deleteCodeSnippet = new DeleteCodeSnippet(taskRepository);

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

  // ─── Sesión del explorador (SQLite) ─────────────────────────────────────────
  const loadExplorerSession = (): Promise<PersistedExplorerSession | null> =>
    loadExplorerSessionFromDb(db);
  const saveExplorerSession = (session: PersistedExplorerSession): Promise<void> =>
    saveExplorerSessionToDb(db, session);

  // ─── Sesión undo/redo de tareas (SQLite) ────────────────────────────────────
  const loadTaskUndoSession = (): Promise<TaskUndoSession> =>
    loadTaskUndoSessionFromDb(db);
  const saveTaskUndoSession = (session: TaskUndoSession): Promise<void> =>
    saveTaskUndoSessionToDb(db, session);

  // ─── Preferencias de app (módulo Settings en core, repositorio SQLite) ─────
  const appSettingsRepository = new AppSettingsSqliteRepository(db);
  const getAppSettings = new GetAppSettings(appSettingsRepository);
  const saveAppSettingUseCase = new SaveAppSetting(appSettingsRepository);
  const loadAppSettings = (): Promise<AppSettingsDTO> => getAppSettings.execute();
  const saveAppSetting = (key: AppSettingsKey, value: string | boolean): Promise<void> =>
    saveAppSettingUseCase.execute({ key, value });

  // ─── Event Bus (expuesto para suscripciones desde la UI) ───────────────────────
  // Ya instanciado arriba como eventBus.

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
    updateSubtask,
    deleteSubtask,
    attachCodeToTask,
    listCodeSnippetsForTask,
    deleteCodeSnippet,
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
    loadExplorerSession,
    saveExplorerSession,
    loadTaskUndoSession,
    saveTaskUndoSession,
    loadAppSettings,
    saveAppSetting,
    eventBus,
  };
}
