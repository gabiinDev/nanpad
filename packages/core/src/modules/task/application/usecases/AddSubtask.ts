/**
 * UseCase: Añadir una subtarea a una tarea existente.
 */

import { Subtask } from "../../domain/entities/Subtask";
import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository";
import type { IEventBus } from "@shared/event-bus/types";
import { createEvent } from "@shared/event-bus/EventBus";
import type { AddSubtaskInput, SubtaskDTO } from "../dtos/TaskDTO";
import { subtaskToDTO } from "../dtos/mappers";

/**
 * Añade una nueva subtarea a una tarea existente.
 * Emite "task.subtask.added" para registro en historial.
 */
export class AddSubtask {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * @param input - ID de la tarea padre y título de la subtarea.
   * @returns DTO de la subtarea creada.
   * @throws {Error} Si la tarea padre no existe o el título está vacío.
   */
  async execute(input: AddSubtaskInput): Promise<SubtaskDTO> {
    const task = await this.taskRepository.findById(input.taskId);
    if (!task) {
      throw new Error(`[AddSubtask] Tarea no encontrada: ${input.taskId}`);
    }

    const subtask = Subtask.create({
      taskId: input.taskId,
      title: input.title,
      sortOrder: task.subtasks.length,
    });

    await this.taskRepository.saveSubtask(subtask);

    this.eventBus.emitAsync(
      createEvent("task.subtask.added", {
        taskId: input.taskId,
        subtaskId: subtask.id,
        title: subtask.title,
      })
    );

    return subtaskToDTO(subtask);
  }
}
