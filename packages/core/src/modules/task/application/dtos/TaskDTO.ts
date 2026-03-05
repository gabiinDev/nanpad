/**
 * DTOs del módulo Task.
 * Son el único contrato público entre este módulo y el resto de la aplicación.
 * No contienen lógica; solo estructuras de datos serializables.
 */

import type { TaskStatusValue } from "../../domain/value-objects/TaskStatus.ts";
import type { PriorityValue } from "../../domain/value-objects/Priority.ts";

/** DTO de una tarea completa. */
export interface TaskDTO {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatusValue;
  priority: PriorityValue;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  documentId: string | null;
  categoryIds: string[];
  tagIds: string[];
  subtasks: SubtaskDTO[];
}

/** DTO de una subtarea. */
export interface SubtaskDTO {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** DTO de un fragmento de código adjunto. */
export interface CodeSnippetDTO {
  id: string;
  taskId: string;
  content: string;
  language: string | null;
  filePath: string | null;
  lineStart: number | null;
  lineEnd: number | null;
  createdAt: string;
}

/** Filtros disponibles para ListTasks. */
export interface TaskFilters {
  status?: TaskStatusValue | TaskStatusValue[];
  categoryId?: string;
  tagId?: string;
  priority?: PriorityValue;
  text?: string;
}

/** Input para CreateTask. */
export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: PriorityValue;
  categoryIds?: string[];
  tagIds?: string[];
}

/** Input para UpdateTask. */
export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string | null;
  priority?: PriorityValue;
  categoryIds?: string[];
  tagIds?: string[];
  sortOrder?: number;
  documentId?: string | null;
}

/** Input para MoveTaskStatus. */
export interface MoveTaskStatusInput {
  id: string;
  newStatus: TaskStatusValue;
}

/** Input para AddSubtask. */
export interface AddSubtaskInput {
  taskId: string;
  title: string;
}

/** Input para AttachCodeToTask. */
export interface AttachCodeToTaskInput {
  taskId: string;
  content: string;
  language?: string | null;
  filePath?: string | null;
  lineStart?: number | null;
  lineEnd?: number | null;
}
