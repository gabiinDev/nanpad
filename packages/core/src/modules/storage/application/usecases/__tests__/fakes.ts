/**
 * Fake de IStoragePort para tests del módulo Storage.
 * Simula la capa de acceso a DB en memoria.
 */

import type { IStoragePort } from "@modules/storage/infrastructure/IStoragePort";
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

/** Implementación en memoria de IStoragePort para tests. */
export class InMemoryStoragePort implements IStoragePort {
  schemaVersion = 1;
  categories: CategoryRow[] = [];
  tags: TagRow[] = [];
  tasks: TaskRow[] = [];
  taskCategories: TaskCategoryRow[] = [];
  taskTags: TaskTagRow[] = [];
  subtasks: SubtaskRow[] = [];
  taskCodeSnippets: TaskCodeSnippetRow[] = [];
  documents: DocumentRow[] = [];
  documentContents: DocumentContentRow[] = [];
  historyEntries: HistoryEntryRow[] = [];

  async getCurrentSchemaVersion(): Promise<number> {
    return this.schemaVersion;
  }

  async readCategories(): Promise<CategoryRow[]> { return [...this.categories]; }
  async readTags(): Promise<TagRow[]> { return [...this.tags]; }
  async readTasks(): Promise<TaskRow[]> { return [...this.tasks]; }
  async readTaskCategories(): Promise<TaskCategoryRow[]> { return [...this.taskCategories]; }
  async readTaskTags(): Promise<TaskTagRow[]> { return [...this.taskTags]; }
  async readSubtasks(): Promise<SubtaskRow[]> { return [...this.subtasks]; }
  async readTaskCodeSnippets(): Promise<TaskCodeSnippetRow[]> { return [...this.taskCodeSnippets]; }
  async readDocuments(): Promise<DocumentRow[]> { return [...this.documents]; }
  async readDocumentContents(): Promise<DocumentContentRow[]> { return [...this.documentContents]; }
  async readHistoryEntries(): Promise<HistoryEntryRow[]> { return [...this.historyEntries]; }

  async clearAllData(): Promise<void> {
    this.categories = [];
    this.tags = [];
    this.tasks = [];
    this.taskCategories = [];
    this.taskTags = [];
    this.subtasks = [];
    this.taskCodeSnippets = [];
    this.documents = [];
    this.documentContents = [];
    this.historyEntries = [];
  }

  async insertCategories(rows: CategoryRow[]): Promise<number> {
    const before = this.categories.length;
    for (const r of rows) {
      if (!this.categories.find((c) => c.id === r.id)) this.categories.push(r);
    }
    return this.categories.length - before;
  }

  async insertTags(rows: TagRow[]): Promise<number> {
    const before = this.tags.length;
    for (const r of rows) {
      if (!this.tags.find((t) => t.id === r.id)) this.tags.push(r);
    }
    return this.tags.length - before;
  }

  async insertTasks(rows: TaskRow[]): Promise<number> {
    const before = this.tasks.length;
    for (const r of rows) {
      if (!this.tasks.find((t) => t.id === r.id)) this.tasks.push(r);
    }
    return this.tasks.length - before;
  }

  async insertTaskCategories(rows: TaskCategoryRow[]): Promise<number> {
    const before = this.taskCategories.length;
    for (const r of rows) {
      if (!this.taskCategories.find((t) => t.task_id === r.task_id && t.category_id === r.category_id)) {
        this.taskCategories.push(r);
      }
    }
    return this.taskCategories.length - before;
  }

  async insertTaskTags(rows: TaskTagRow[]): Promise<number> {
    const before = this.taskTags.length;
    for (const r of rows) {
      if (!this.taskTags.find((t) => t.task_id === r.task_id && t.tag_id === r.tag_id)) {
        this.taskTags.push(r);
      }
    }
    return this.taskTags.length - before;
  }

  async insertSubtasks(rows: SubtaskRow[]): Promise<number> {
    const before = this.subtasks.length;
    for (const r of rows) {
      if (!this.subtasks.find((s) => s.id === r.id)) this.subtasks.push(r);
    }
    return this.subtasks.length - before;
  }

  async insertTaskCodeSnippets(rows: TaskCodeSnippetRow[]): Promise<number> {
    const before = this.taskCodeSnippets.length;
    for (const r of rows) {
      if (!this.taskCodeSnippets.find((s) => s.id === r.id)) this.taskCodeSnippets.push(r);
    }
    return this.taskCodeSnippets.length - before;
  }

  async insertDocuments(rows: DocumentRow[]): Promise<number> {
    const before = this.documents.length;
    for (const r of rows) {
      if (!this.documents.find((d) => d.id === r.id)) this.documents.push(r);
    }
    return this.documents.length - before;
  }

  async insertDocumentContents(rows: DocumentContentRow[]): Promise<number> {
    const before = this.documentContents.length;
    for (const r of rows) {
      if (!this.documentContents.find((d) => d.document_id === r.document_id)) {
        this.documentContents.push(r);
      }
    }
    return this.documentContents.length - before;
  }

  async insertHistoryEntries(rows: HistoryEntryRow[]): Promise<number> {
    const before = this.historyEntries.length;
    for (const r of rows) {
      if (!this.historyEntries.find((h) => h.id === r.id)) this.historyEntries.push(r);
    }
    return this.historyEntries.length - before;
  }
}

/** Genera una TaskRow mínima para tests. */
export function makeTaskRow(id: string, title = "Task"): TaskRow {
  const now = new Date().toISOString();
  return {
    id,
    title,
    description: null,
    status: "todo",
    priority: 1,
    sort_order: 0,
    completed_at: null,
    created_at: now,
    updated_at: now,
    document_id: null,
  };
}

/** Genera una CategoryRow mínima para tests. */
export function makeCategoryRow(id: string, name = "Category"): CategoryRow {
  const now = new Date().toISOString();
  return {
    id,
    name,
    parent_id: null,
    color: null,
    icon: null,
    sort_order: 0,
    created_at: now,
    updated_at: now,
  };
}
