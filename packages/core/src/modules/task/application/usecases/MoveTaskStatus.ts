/**
 * UseCase: Mover una tarea a un nuevo estado (para vista Kanban).
 */

import { TaskStatus } from "../../domain/value-objects/TaskStatus.ts";
import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository.ts";
import type { IEventBus } from "@shared/event-bus/types.ts";
import { createEvent } from "@shared/event-bus/EventBus.ts";
import type { MoveTaskStatusInput, TaskDTO } from "../dtos/TaskDTO.ts";
import { taskToDTO } from "../dtos/mappers.ts";

/**
 * Cambia el estado de una tarea.
 * Emite el evento "task.status_changed" al finalizar.
 */
export class MoveTaskStatus {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * @param input - ID de la tarea y nuevo estado.
   * @returns DTO de la tarea con el estado actualizado.
   * @throws {Error} Si la tarea no existe o la transición no es válida.
   */
  async execute(input: MoveTaskStatusInput): Promise<TaskDTO> {
    const task = await this.taskRepository.findById(input.id);
    if (!task) throw new Error(`[MoveTaskStatus] Tarea no encontrada: ${input.id}`);

    const oldStatus = task.status.value;
    const moved = task.moveToStatus(TaskStatus.from(input.newStatus));

    await this.taskRepository.save(moved);

    this.eventBus.emitAsync(
      createEvent("task.status_changed", {
        taskId: moved.id,
        oldStatus,
        newStatus: moved.status.value,
      })
    );

    return taskToDTO(moved);
  }
}
