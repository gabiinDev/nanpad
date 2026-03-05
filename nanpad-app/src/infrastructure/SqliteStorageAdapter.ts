/**
 * Implementación de IStoragePort sobre SqliteAdapter.
 * Permite al módulo Storage leer/escribir todas las tablas
 * para export, import y backup.
 */

import type { IStoragePort } from "@nanpad/core";
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
} from "@nanpad/core";
import type { IDatabase } from "@nanpad/core";

/**
 * Adaptador de Storage que usa IDatabase (SqliteAdapter) como backend.
 * Se instancia en el Composition Root.
 */
export class SqliteStorageAdapter implements IStoragePort {
  constructor(private readonly db: IDatabase) {}

  async getCurrentSchemaVersion(): Promise<number> {
    const rows = await this.db.select<{ version: number | null }[]>(
      "SELECT MAX(version) as version FROM schema_version"
    );
    return rows[0]?.version ?? 0;
  }

  async readCategories(): Promise<CategoryRow[]> {
    return this.db.select<CategoryRow[]>("SELECT * FROM categories ORDER BY sort_order");
  }
  async readTags(): Promise<TagRow[]> {
    return this.db.select<TagRow[]>("SELECT * FROM tags ORDER BY name");
  }
  async readTasks(): Promise<TaskRow[]> {
    return this.db.select<TaskRow[]>("SELECT * FROM tasks ORDER BY created_at");
  }
  async readTaskCategories(): Promise<TaskCategoryRow[]> {
    return this.db.select<TaskCategoryRow[]>("SELECT * FROM task_categories");
  }
  async readTaskTags(): Promise<TaskTagRow[]> {
    return this.db.select<TaskTagRow[]>("SELECT * FROM task_tags");
  }
  async readSubtasks(): Promise<SubtaskRow[]> {
    return this.db.select<SubtaskRow[]>("SELECT * FROM subtasks ORDER BY sort_order");
  }
  async readTaskCodeSnippets(): Promise<TaskCodeSnippetRow[]> {
    return this.db.select<TaskCodeSnippetRow[]>("SELECT * FROM task_code_snippets ORDER BY created_at");
  }
  async readDocuments(): Promise<DocumentRow[]> {
    return this.db.select<DocumentRow[]>("SELECT * FROM documents ORDER BY updated_at DESC");
  }
  async readDocumentContents(): Promise<DocumentContentRow[]> {
    return this.db.select<DocumentContentRow[]>("SELECT * FROM document_content");
  }
  async readHistoryEntries(): Promise<HistoryEntryRow[]> {
    return this.db.select<HistoryEntryRow[]>("SELECT * FROM history_entries ORDER BY created_at");
  }

  async clearAllData(): Promise<void> {
    // Orden respeta las FK (hijos antes que padres)
    const tables = [
      "history_entries",
      "document_content",
      "documents",
      "task_code_snippets",
      "subtasks",
      "task_tags",
      "task_categories",
      "tasks",
      "tags",
      "categories",
    ];
    for (const t of tables) {
      await this.db.execute(`DELETE FROM ${t}`);
    }
  }

  async insertCategories(rows: CategoryRow[]): Promise<number> {
    let count = 0;
    for (const r of rows) {
      const res = await this.db.execute(
        `INSERT OR IGNORE INTO categories (id,name,parent_id,color,icon,sort_order,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [r.id, r.name, r.parent_id, r.color, r.icon, r.sort_order, r.created_at, r.updated_at]
      );
      count += res.rowsAffected;
    }
    return count;
  }

  async insertTags(rows: TagRow[]): Promise<number> {
    let count = 0;
    for (const r of rows) {
      const res = await this.db.execute(
        `INSERT OR IGNORE INTO tags (id,name,color,created_at) VALUES (?,?,?,?)`,
        [r.id, r.name, r.color, r.created_at]
      );
      count += res.rowsAffected;
    }
    return count;
  }

  async insertTasks(rows: TaskRow[]): Promise<number> {
    let count = 0;
    for (const r of rows) {
      const res = await this.db.execute(
        `INSERT OR IGNORE INTO tasks (id,title,description,status,priority,sort_order,completed_at,created_at,updated_at,document_id)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [r.id, r.title, r.description, r.status, r.priority, r.sort_order, r.completed_at, r.created_at, r.updated_at, r.document_id]
      );
      count += res.rowsAffected;
    }
    return count;
  }

  async insertTaskCategories(rows: TaskCategoryRow[]): Promise<number> {
    let count = 0;
    for (const r of rows) {
      const res = await this.db.execute(
        `INSERT OR IGNORE INTO task_categories (task_id,category_id) VALUES (?,?)`,
        [r.task_id, r.category_id]
      );
      count += res.rowsAffected;
    }
    return count;
  }

  async insertTaskTags(rows: TaskTagRow[]): Promise<number> {
    let count = 0;
    for (const r of rows) {
      const res = await this.db.execute(
        `INSERT OR IGNORE INTO task_tags (task_id,tag_id) VALUES (?,?)`,
        [r.task_id, r.tag_id]
      );
      count += res.rowsAffected;
    }
    return count;
  }

  async insertSubtasks(rows: SubtaskRow[]): Promise<number> {
    let count = 0;
    for (const r of rows) {
      const res = await this.db.execute(
        `INSERT OR IGNORE INTO subtasks (id,task_id,title,completed,sort_order,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?)`,
        [r.id, r.task_id, r.title, r.completed, r.sort_order, r.created_at, r.updated_at]
      );
      count += res.rowsAffected;
    }
    return count;
  }

  async insertTaskCodeSnippets(rows: TaskCodeSnippetRow[]): Promise<number> {
    let count = 0;
    for (const r of rows) {
      const res = await this.db.execute(
        `INSERT OR IGNORE INTO task_code_snippets (id,task_id,content,language,file_path,line_start,line_end,created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [r.id, r.task_id, r.content, r.language, r.file_path, r.line_start, r.line_end, r.created_at]
      );
      count += res.rowsAffected;
    }
    return count;
  }

  async insertDocuments(rows: DocumentRow[]): Promise<number> {
    let count = 0;
    for (const r of rows) {
      const res = await this.db.execute(
        `INSERT OR IGNORE INTO documents (id,title,file_path,content_hash,created_at,updated_at)
         VALUES (?,?,?,?,?,?)`,
        [r.id, r.title, r.file_path, r.content_hash, r.created_at, r.updated_at]
      );
      count += res.rowsAffected;
    }
    return count;
  }

  async insertDocumentContents(rows: DocumentContentRow[]): Promise<number> {
    let count = 0;
    for (const r of rows) {
      const res = await this.db.execute(
        `INSERT OR IGNORE INTO document_content (document_id,content,updated_at) VALUES (?,?,?)`,
        [r.document_id, r.content, r.updated_at]
      );
      count += res.rowsAffected;
    }
    return count;
  }

  async insertHistoryEntries(rows: HistoryEntryRow[]): Promise<number> {
    let count = 0;
    for (const r of rows) {
      const res = await this.db.execute(
        `INSERT OR IGNORE INTO history_entries (id,entity_type,entity_id,action,field_name,old_value,new_value,created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [r.id, r.entity_type, r.entity_id, r.action, r.field_name, r.old_value, r.new_value, r.created_at]
      );
      count += res.rowsAffected;
    }
    return count;
  }
}
