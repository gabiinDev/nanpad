/**
 * UseCase: Restaurar una tarea completada o archivada al estado "todo".
 */

import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository";
import type { IEventBus } from "@shared/event-bus/types";
import { createEvent } from "@shared/event-bus/EventBus";
import type { TaskDTO } from "../dtos/TaskDTO";
import { taskToDTO } from "../dtos/mappers";

/**
 * Restaura una tarea al estado "todo".
 * Emite el evento "task.restored" al finalizar.
 */
export class RestoreTask {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * @param taskId - ID de la tarea a restaurar.
   * @returns DTO de la tarea restaurada.
   * @throws {Error} Si la tarea no existe.
   */
  async execute(taskId: string): Promise<TaskDTO> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new Error(`[RestoreTask] Tarea no encontrada: ${taskId}`);

    const restored = task.restore();
    await this.taskRepository.save(restored);

    this.eventBus.emitAsync(
      createEvent("task.restored", { taskId: restored.id })
    );

    return taskToDTO(restored);
  }
}
