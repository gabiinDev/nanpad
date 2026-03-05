/**
 * UseCase: Marcar una tarea como completada.
 */

import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository";
import type { IEventBus } from "@shared/event-bus/types";
import { createEvent } from "@shared/event-bus/EventBus";
import type { TaskDTO } from "../dtos/TaskDTO";
import { taskToDTO } from "../dtos/mappers";

/**
 * Marca una tarea como completada (estado "done").
 * Emite el evento "task.completed" al finalizar.
 */
export class CompleteTask {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * @param taskId - ID de la tarea a completar.
   * @returns DTO de la tarea completada.
   * @throws {Error} Si la tarea no existe o ya está completada.
   */
  async execute(taskId: string): Promise<TaskDTO> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new Error(`[CompleteTask] Tarea no encontrada: ${taskId}`);

    const completed = task.complete();
    await this.taskRepository.save(completed);

    this.eventBus.emitAsync(
      createEvent("task.completed", {
        taskId: completed.id,
        completedAt: completed.completedAt!.toISOString(),
      })
    );

    return taskToDTO(completed);
  }
}
