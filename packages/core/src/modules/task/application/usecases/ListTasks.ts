/**
 * UseCase: Listar tareas con filtros y paginación opcionales.
 */

import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository";
import type { ListTasksInput, ListTasksResult } from "../dtos/TaskDTO";
import { taskToDTO } from "../dtos/mappers";

/**
 * Lista las tareas aplicando filtros y, opcionalmente, paginación.
 * No emite eventos (operación de solo lectura).
 */
export class ListTasks {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * @param input - Filtros y/o limit/offset para paginación.
   * @returns Lista de tareas de la página actual y total de registros.
   */
  async execute(input?: ListTasksInput): Promise<ListTasksResult> {
    const filters = input?.filters;
    const pagination =
      input?.limit != null && input?.offset != null
        ? { limit: input.limit, offset: input.offset }
        : undefined;
    const { tasks, total } = await this.taskRepository.findAll(filters, pagination);
    return { tasks: tasks.map(taskToDTO), total };
  }
}
