/**
 * Interfaz del repositorio de tareas.
 * Define el contrato de persistencia para el módulo Task.
 * Las implementaciones concretas están en sqlite/.
 */

import type { Task } from "../../domain/entities/Task.ts";
import type { Subtask } from "../../domain/entities/Subtask.ts";
import type { CodeSnippet } from "../../domain/entities/CodeSnippet.ts";
import type { TaskFilters } from "../../application/dtos/TaskDTO.ts";
import type { EntityId } from "@shared/types/id.ts";

/**
 * Contrato del repositorio de tareas.
 * Todas las operaciones son asíncronas.
 */
export interface ITaskRepository {
  /**
   * Guarda una tarea nueva o actualiza una existente.
   * @param task - Entidad Task a persistir.
   */
  save(task: Task): Promise<void>;

  /**
   * Busca una tarea por su ID.
   * @param id - ID de la tarea.
   * @returns La tarea encontrada o null si no existe.
   */
  findById(id: EntityId): Promise<Task | null>;

  /**
   * Lista tareas aplicando filtros opcionales.
   * @param filters - Filtros a aplicar.
   * @returns Array de tareas que coinciden con los filtros.
   */
  findAll(filters?: TaskFilters): Promise<Task[]>;

  /**
   * Elimina una tarea por su ID.
   * @param id - ID de la tarea a eliminar.
   */
  delete(id: EntityId): Promise<void>;

  /**
   * Guarda una subtarea nueva o actualiza una existente.
   * @param subtask - Entidad Subtask a persistir.
   */
  saveSubtask(subtask: Subtask): Promise<void>;

  /**
   * Elimina una subtarea por su ID.
   * @param id - ID de la subtarea.
   */
  deleteSubtask(id: EntityId): Promise<void>;

  /**
   * Guarda un fragmento de código adjunto a una tarea.
   * @param snippet - Entidad CodeSnippet a persistir.
   */
  saveCodeSnippet(snippet: CodeSnippet): Promise<void>;

  /**
   * Lista los fragmentos de código de una tarea.
   * @param taskId - ID de la tarea.
   */
  findCodeSnippets(taskId: EntityId): Promise<CodeSnippet[]>;
}
