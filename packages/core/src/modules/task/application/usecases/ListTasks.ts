/**
 * UseCase: Listar tareas con filtros opcionales.
 */

import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository.ts";
import type { TaskFilters, TaskDTO } from "../dtos/TaskDTO.ts";
import { taskToDTO } from "../dtos/mappers.ts";

/**
 * Lista las tareas aplicando filtros opcionales.
 * No emite eventos (operación de solo lectura).
 */
export class ListTasks {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * @param filters - Filtros opcionales (status, categoryId, tagId, priority, text).
   * @returns Array de DTOs de tareas que cumplen los filtros.
   */
  async execute(filters?: TaskFilters): Promise<TaskDTO[]> {
    const tasks = await this.taskRepository.findAll(filters);
    return tasks.map(taskToDTO);
  }
}
