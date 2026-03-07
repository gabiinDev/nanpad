/**
 * Fakes para tests del módulo Task.
 * Implementaciones en memoria de los repositorios e interfaces necesarias.
 */

import type { ITaskRepository } from "../../../infrastructure/persistence/TaskRepository";
import type { Task } from "../../../domain/entities/Task";
import type { Subtask } from "../../../domain/entities/Subtask";
import type { CodeSnippet } from "../../../domain/entities/CodeSnippet";
import type { TaskFilters } from "../../dtos/TaskDTO";
import type { EntityId } from "@shared/types/id";
import type { IHistoryRepository } from "@modules/history/infrastructure/persistence/HistoryRepository";
import { HistoryEntry } from "@modules/history/domain/entities/HistoryEntry";

/** Repositorio de tareas en memoria para tests. */
export class InMemoryTaskRepository implements ITaskRepository {
  private tasks = new Map<string, Task>();
  private subtasks = new Map<string, Subtask>();
  private snippets = new Map<string, CodeSnippet>();

  async save(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
  }

  async findById(id: EntityId): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }

  async findAll(filters?: TaskFilters): Promise<Task[]> {
    let results = [...this.tasks.values()];

    if (filters?.status !== undefined) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      results = results.filter((t) => statuses.includes(t.status.value));
    }

    if (filters?.priority !== undefined) {
      results = results.filter((t) => t.priority.value === filters.priority);
    }

    if (filters?.categoryId) {
      results = results.filter((t) => t.categoryIds.includes(filters.categoryId!));
    }

    if (filters?.tagId) {
      results = results.filter((t) => t.tagIds.includes(filters.tagId!));
    }

    if (filters?.text) {
      const text = filters.text.toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(text) ||
          t.description?.toLowerCase().includes(text)
      );
    }

    return results;
  }

  async delete(id: EntityId): Promise<void> {
    this.tasks.delete(id);
  }

  async saveSubtask(subtask: Subtask): Promise<void> {
    this.subtasks.set(subtask.id, subtask);
  }

  async deleteSubtask(id: EntityId): Promise<void> {
    this.subtasks.delete(id);
  }

  async saveCodeSnippet(snippet: CodeSnippet): Promise<void> {
    this.snippets.set(snippet.id, snippet);
  }

  async findCodeSnippets(taskId: EntityId): Promise<CodeSnippet[]> {
    return [...this.snippets.values()].filter((s) => s.taskId === taskId);
  }

  async deleteCodeSnippet(snippetId: EntityId): Promise<void> {
    this.snippets.delete(snippetId);
  }

  /** Utilidad de test: obtener todas las tareas. */
  getAllTasks(): Task[] {
    return [...this.tasks.values()];
  }

  /** Utilidad de test: obtener todas las subtareas. */
  getAllSubtasks(): Subtask[] {
    return [...this.subtasks.values()];
  }
}

/** Repositorio de historial en memoria para tests. */
export class InMemoryHistoryRepository implements IHistoryRepository {
  private entries = new Map<string, HistoryEntry>();

  async save(entry: HistoryEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async findByEntity(
    entityType: string,
    entityId: EntityId
  ): Promise<HistoryEntry[]> {
    return [...this.entries.values()].filter(
      (e) => e.entityType === entityType && e.entityId === entityId
    );
  }

  async findByEntityType(entityType: string): Promise<HistoryEntry[]> {
    return [...this.entries.values()].filter(
      (e) => e.entityType === entityType
    );
  }

  /** Utilidad de test: obtener todos los registros. */
  getAll(): HistoryEntry[] {
    return [...this.entries.values()];
  }
}
