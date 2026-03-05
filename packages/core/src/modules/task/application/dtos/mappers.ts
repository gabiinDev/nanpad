/**
 * Funciones de mapeo entre entidades de dominio y DTOs del módulo Task.
 * Son puras y sin efectos secundarios.
 */

import type { Task } from "../../domain/entities/Task";
import type { Subtask } from "../../domain/entities/Subtask";
import type { CodeSnippet } from "../../domain/entities/CodeSnippet";
import type { TaskDTO, SubtaskDTO, CodeSnippetDTO } from "./TaskDTO";

/**
 * Convierte una entidad Task a TaskDTO.
 * @param task - Entidad de dominio.
 * @returns DTO serializable.
 */
export function taskToDTO(task: Task): TaskDTO {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status.value,
    priority: task.priority.value,
    sortOrder: task.sortOrder,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    documentId: task.documentId,
    categoryIds: [...task.categoryIds],
    tagIds: [...task.tagIds],
    subtasks: task.subtasks.map(subtaskToDTO),
  };
}

/**
 * Convierte una entidad Subtask a SubtaskDTO.
 * @param subtask - Entidad de dominio.
 */
export function subtaskToDTO(subtask: Subtask): SubtaskDTO {
  return {
    id: subtask.id,
    taskId: subtask.taskId,
    title: subtask.title,
    completed: subtask.completed,
    sortOrder: subtask.sortOrder,
    createdAt: subtask.createdAt.toISOString(),
    updatedAt: subtask.updatedAt.toISOString(),
  };
}

/**
 * Convierte una entidad CodeSnippet a CodeSnippetDTO.
 * @param snippet - Entidad de dominio.
 */
export function codeSnippetToDTO(snippet: CodeSnippet): CodeSnippetDTO {
  return {
    id: snippet.id,
    taskId: snippet.taskId,
    content: snippet.content,
    language: snippet.language,
    filePath: snippet.filePath,
    lineStart: snippet.lineStart,
    lineEnd: snippet.lineEnd,
    createdAt: snippet.createdAt.toISOString(),
  };
}
