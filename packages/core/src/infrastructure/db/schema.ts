/**
 * Tipos TypeScript que reflejan el esquema SQLite de NANPAD.
 * Estos tipos son la representación directa de las filas de la base de datos
 * y se usan solo en la capa de infraestructura (repositories).
 */

/** Fila de la tabla `schema_version`. */
export interface SchemaVersionRow {
  version: number;
  applied_at: string;
}

/** Fila de la tabla `categories`. */
export interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Fila de la tabla `tags`. */
export interface TagRow {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

/** Fila de la tabla `tasks`. */
export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  document_id: string | null;
}

/** Fila de la tabla `task_categories`. */
export interface TaskCategoryRow {
  task_id: string;
  category_id: string;
}

/** Fila de la tabla `task_tags`. */
export interface TaskTagRow {
  task_id: string;
  tag_id: string;
}

/** Fila de la tabla `subtasks`. */
export interface SubtaskRow {
  id: string;
  task_id: string;
  title: string;
  completed: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Fila de la tabla `task_code_snippets`. */
export interface TaskCodeSnippetRow {
  id: string;
  task_id: string;
  content: string;
  language: string | null;
  file_path: string | null;
  line_start: number | null;
  line_end: number | null;
  created_at: string;
}

/** Fila de la tabla `documents`. */
export interface DocumentRow {
  id: string;
  title: string;
  file_path: string | null;
  content_hash: string | null;
  created_at: string;
  updated_at: string;
}

/** Fila de la tabla `document_content`. */
export interface DocumentContentRow {
  document_id: string;
  content: string;
  updated_at: string;
}

/** Fila de la tabla `history_entries`. */
export interface HistoryEntryRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}
