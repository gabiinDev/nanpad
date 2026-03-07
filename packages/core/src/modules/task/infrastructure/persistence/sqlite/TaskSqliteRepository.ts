/**
 * Implementación del repositorio de tareas sobre IDatabase.
 * No importa nada de Tauri — recibe IDatabase por inyección.
 */

import type { IDatabase } from "@infra/db/IDatabase";
import type { ITaskRepository } from "../TaskRepository";
import { Task } from "../../../domain/entities/Task";
import { Subtask } from "../../../domain/entities/Subtask";
import { CodeSnippet } from "../../../domain/entities/CodeSnippet";
import { TaskStatus } from "../../../domain/value-objects/TaskStatus";
import { Priority } from "../../../domain/value-objects/Priority";
import type { TaskFilters } from "../../../application/dtos/TaskDTO";
import type { EntityId } from "@shared/types/id";
import type {
  TaskRow,
  SubtaskRow,
  TaskCodeSnippetRow,
} from "@infra/db/schema";

/**
 * Repositorio de tareas que opera sobre cualquier implementación de IDatabase.
 * Recibe la instancia por inyección desde el Composition Root.
 */
export class TaskSqliteRepository implements ITaskRepository {
  constructor(private readonly db: IDatabase) {}

  // ─── Task ────────────────────────────────────────────────────────────────

  async save(task: Task): Promise<void> {
    const existing = await this.db.select<TaskRow[]>(
      "SELECT id FROM tasks WHERE id = $1",
      [task.id]
    );

    if (existing.length === 0) {
      await this.db.execute(
        `INSERT INTO tasks (id, title, description, status, priority, sort_order,
          completed_at, created_at, updated_at, document_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          task.id,
          task.title,
          task.description,
          task.status.value,
          task.priority.value,
          task.sortOrder,
          task.completedAt?.toISOString() ?? null,
          task.createdAt.toISOString(),
          task.updatedAt.toISOString(),
          task.documentId,
        ]
      );
    } else {
      await this.db.execute(
        `UPDATE tasks SET title=$1, description=$2, status=$3, priority=$4,
          sort_order=$5, completed_at=$6, updated_at=$7, document_id=$8
         WHERE id=$9`,
        [
          task.title,
          task.description,
          task.status.value,
          task.priority.value,
          task.sortOrder,
          task.completedAt?.toISOString() ?? null,
          task.updatedAt.toISOString(),
          task.documentId,
          task.id,
        ]
      );
    }

    await this.syncCategories(task.id, [...task.categoryIds]);
    await this.syncTags(task.id, [...task.tagIds]);
  }

  async findById(id: EntityId): Promise<Task | null> {
    const rows = await this.db.select<TaskRow[]>(
      "SELECT * FROM tasks WHERE id = $1",
      [id]
    );
    if (rows.length === 0) return null;
    return this.rowToTask(rows[0]);
  }

  async findAll(filters?: TaskFilters): Promise<Task[]> {
    const { sql, params } = buildFindAllQuery(filters);
    const rows = await this.db.select<TaskRow[]>(sql, params);
    return Promise.all(rows.map((r) => this.rowToTask(r)));
  }

  async delete(id: EntityId): Promise<void> {
    await this.db.execute("DELETE FROM tasks WHERE id = $1", [id]);
  }

  // ─── Subtask ──────────────────────────────────────────────────────────────

  async saveSubtask(subtask: Subtask): Promise<void> {
    const existing = await this.db.select<{ id: string }[]>(
      "SELECT id FROM subtasks WHERE id = $1",
      [subtask.id]
    );

    if (existing.length === 0) {
      await this.db.execute(
        `INSERT INTO subtasks (id, task_id, title, completed, sort_order, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          subtask.id,
          subtask.taskId,
          subtask.title,
          subtask.completed ? 1 : 0,
          subtask.sortOrder,
          subtask.createdAt.toISOString(),
          subtask.updatedAt.toISOString(),
        ]
      );
    } else {
      await this.db.execute(
        `UPDATE subtasks SET title=$1, completed=$2, sort_order=$3, updated_at=$4
         WHERE id=$5`,
        [
          subtask.title,
          subtask.completed ? 1 : 0,
          subtask.sortOrder,
          subtask.updatedAt.toISOString(),
          subtask.id,
        ]
      );
    }
  }

  async deleteSubtask(id: EntityId): Promise<void> {
    await this.db.execute("DELETE FROM subtasks WHERE id = $1", [id]);
  }

  // ─── CodeSnippet ──────────────────────────────────────────────────────────

  async saveCodeSnippet(snippet: CodeSnippet): Promise<void> {
    await this.db.execute(
      `INSERT OR IGNORE INTO task_code_snippets
        (id, task_id, content, language, file_path, line_start, line_end, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        snippet.id,
        snippet.taskId,
        snippet.content,
        snippet.language,
        snippet.filePath,
        snippet.lineStart,
        snippet.lineEnd,
        snippet.createdAt.toISOString(),
      ]
    );
  }

  async findCodeSnippets(taskId: EntityId): Promise<CodeSnippet[]> {
    const rows = await this.db.select<TaskCodeSnippetRow[]>(
      "SELECT * FROM task_code_snippets WHERE task_id = $1 ORDER BY created_at ASC",
      [taskId]
    );
    return rows.map(rowToCodeSnippet);
  }

  async deleteCodeSnippet(snippetId: EntityId): Promise<void> {
    await this.db.execute("DELETE FROM task_code_snippets WHERE id = $1", [snippetId]);
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private async rowToTask(row: TaskRow): Promise<Task> {
    const [categoryRows, tagRows, subtaskRows] = await Promise.all([
      this.db.select<{ category_id: string }[]>(
        "SELECT category_id FROM task_categories WHERE task_id = $1",
        [row.id]
      ),
      this.db.select<{ tag_id: string }[]>(
        "SELECT tag_id FROM task_tags WHERE task_id = $1",
        [row.id]
      ),
      this.db.select<SubtaskRow[]>(
        "SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order ASC",
        [row.id]
      ),
    ]);

    return Task.reconstitute({
      id: row.id,
      title: row.title,
      description: row.description,
      status: TaskStatus.from(row.status),
      priority: Priority.from(row.priority),
      sortOrder: row.sort_order,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      documentId: row.document_id,
      categoryIds: categoryRows.map((r) => r.category_id),
      tagIds: tagRows.map((r) => r.tag_id),
      subtasks: subtaskRows.map(rowToSubtask),
    });
  }

  private async syncCategories(taskId: EntityId, categoryIds: EntityId[]): Promise<void> {
    await this.db.execute("DELETE FROM task_categories WHERE task_id = $1", [taskId]);
    for (const catId of categoryIds) {
      await this.db.execute(
        "INSERT OR IGNORE INTO task_categories (task_id, category_id) VALUES ($1,$2)",
        [taskId, catId]
      );
    }
  }

  private async syncTags(taskId: EntityId, tagIds: EntityId[]): Promise<void> {
    await this.db.execute("DELETE FROM task_tags WHERE task_id = $1", [taskId]);
    for (const tagId of tagIds) {
      await this.db.execute(
        "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES ($1,$2)",
        [taskId, tagId]
      );
    }
  }
}

// ─── Funciones de mapping ────────────────────────────────────────────────────

function rowToSubtask(row: SubtaskRow): Subtask {
  return Subtask.reconstitute({
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    completed: row.completed === 1,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

function rowToCodeSnippet(row: TaskCodeSnippetRow): CodeSnippet {
  return CodeSnippet.reconstitute({
    id: row.id,
    taskId: row.task_id,
    content: row.content,
    language: row.language,
    filePath: row.file_path,
    lineStart: row.line_start,
    lineEnd: row.line_end,
    createdAt: new Date(row.created_at),
  });
}

function buildFindAllQuery(filters?: TaskFilters): { sql: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters?.status !== undefined) {
    if (Array.isArray(filters.status)) {
      const placeholders = filters.status.map(() => `$${paramIdx++}`).join(",");
      conditions.push(`t.status IN (${placeholders})`);
      params.push(...filters.status);
    } else {
      conditions.push(`t.status = $${paramIdx++}`);
      params.push(filters.status);
    }
  }

  if (filters?.priority !== undefined) {
    conditions.push(`t.priority = $${paramIdx++}`);
    params.push(filters.priority);
  }

  if (filters?.text) {
    conditions.push(`(t.title LIKE $${paramIdx} OR t.description LIKE $${paramIdx})`);
    params.push(`%${filters.text}%`);
    paramIdx++;
  }

  let sql = "SELECT DISTINCT t.* FROM tasks t";

  if (filters?.categoryId) {
    sql += ` JOIN task_categories tc ON tc.task_id = t.id AND tc.category_id = $${paramIdx++}`;
    params.push(filters.categoryId);
  }

  if (filters?.tagId) {
    sql += ` JOIN task_tags tt ON tt.task_id = t.id AND tt.tag_id = $${paramIdx++}`;
    params.push(filters.tagId);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }

  sql += " ORDER BY t.sort_order ASC, t.created_at DESC";

  return { sql, params };
}
