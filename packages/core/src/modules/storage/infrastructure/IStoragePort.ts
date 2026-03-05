/**
 * Puerto de infraestructura del módulo Storage.
 * Proporciona acceso de bajo nivel a la DB para leer/escribir snapshots completos.
 * La implementación concreta (SqliteStorageAdapter) reside en nanpad-app.
 */

import type {
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
} from "@infra/db/schema.ts";

/**
 * Contrato del puerto de almacenamiento.
 * Permite al módulo Storage leer todas las tablas y restaurar el estado completo.
 */
export interface IStoragePort {
  // ─── Lectura de schema ──────────────────────────────────────────────────────
  getCurrentSchemaVersion(): Promise<number>;

  // ─── Lectura de tablas ──────────────────────────────────────────────────────
  readCategories(): Promise<CategoryRow[]>;
  readTags(): Promise<TagRow[]>;
  readTasks(): Promise<TaskRow[]>;
  readTaskCategories(): Promise<TaskCategoryRow[]>;
  readTaskTags(): Promise<TaskTagRow[]>;
  readSubtasks(): Promise<SubtaskRow[]>;
  readTaskCodeSnippets(): Promise<TaskCodeSnippetRow[]>;
  readDocuments(): Promise<DocumentRow[]>;
  readDocumentContents(): Promise<DocumentContentRow[]>;
  readHistoryEntries(): Promise<HistoryEntryRow[]>;

  // ─── Escritura para import ──────────────────────────────────────────────────

  /**
   * Elimina todos los datos del workspace (sin tocar schema_version).
   * Usado cuando `replace: true` en ImportWorkspace.
   */
  clearAllData(): Promise<void>;

  /**
   * Inserta filas en lote usando INSERT OR IGNORE (no duplica existentes).
   * Cada método recibe el array de filas correspondiente.
   */
  insertCategories(rows: CategoryRow[]): Promise<number>;
  insertTags(rows: TagRow[]): Promise<number>;
  insertTasks(rows: TaskRow[]): Promise<number>;
  insertTaskCategories(rows: TaskCategoryRow[]): Promise<number>;
  insertTaskTags(rows: TaskTagRow[]): Promise<number>;
  insertSubtasks(rows: SubtaskRow[]): Promise<number>;
  insertTaskCodeSnippets(rows: TaskCodeSnippetRow[]): Promise<number>;
  insertDocuments(rows: DocumentRow[]): Promise<number>;
  insertDocumentContents(rows: DocumentContentRow[]): Promise<number>;
  insertHistoryEntries(rows: HistoryEntryRow[]): Promise<number>;
}
