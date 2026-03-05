/**
 * DTOs del módulo Storage.
 * Define la estructura del snapshot exportable del workspace completo.
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
} from "@infra/db/schema";

/**
 * Snapshot completo del workspace: todas las tablas serializadas a JSON.
 * La propiedad `schemaVersion` permite detectar si el snapshot es compatible
 * con la versión actual de la DB y si hay que aplicar migraciones.
 */
export interface WorkspaceSnapshot {
  /** Versión del esquema de la DB en el momento de la exportación. */
  schemaVersion: number;
  /** Timestamp ISO del momento de creación del snapshot. */
  exportedAt: string;
  /** Versión de la app (para compatibilidad futura). */
  appVersion: string;
  categories: CategoryRow[];
  tags: TagRow[];
  tasks: TaskRow[];
  taskCategories: TaskCategoryRow[];
  taskTags: TaskTagRow[];
  subtasks: SubtaskRow[];
  taskCodeSnippets: TaskCodeSnippetRow[];
  documents: DocumentRow[];
  documentContents: DocumentContentRow[];
  historyEntries: HistoryEntryRow[];
}

/** Input para ExportWorkspace. */
export interface ExportWorkspaceInput {
  /**
   * Si true, incluye el historial de cambios en el snapshot.
   * Puede incrementar significativamente el tamaño del export.
   * @default true
   */
  includeHistory?: boolean;
}

/** Resultado de ExportWorkspace. */
export interface ExportWorkspaceResult {
  /** JSON serializado del snapshot. */
  json: string;
  /** Nombre de archivo sugerido para el download. */
  filename: string;
  /** Tamaño aproximado en bytes. */
  sizeBytes: number;
}

/** Input para ImportWorkspace. */
export interface ImportWorkspaceInput {
  /** JSON del snapshot previamente exportado. */
  json: string;
  /**
   * Si true, elimina todos los datos actuales antes de importar.
   * Si false, hace un merge (INSERT OR IGNORE).
   * @default false
   */
  replace?: boolean;
}

/** Resultado de ImportWorkspace. */
export interface ImportWorkspaceResult {
  /** Número de filas importadas por tabla. */
  imported: Record<string, number>;
  /** Versión del esquema encontrada en el snapshot. */
  snapshotSchemaVersion: number;
  /** Versión del esquema actual de la DB. */
  currentSchemaVersion: number;
}

/** Resultado de BackupNow. */
export interface BackupResult {
  /** JSON del snapshot. */
  json: string;
  /** Timestamp de creación. */
  createdAt: string;
  /** Nombre de archivo sugerido. */
  filename: string;
}
