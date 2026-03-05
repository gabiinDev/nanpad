/**
 * UseCase: Añadir una subtarea a una tarea existente.
 */

import { Subtask } from "../../domain/entities/Subtask.ts";
import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository.ts";
import type { AddSubtaskInput, SubtaskDTO } from "../dtos/TaskDTO.ts";
import { subtaskToDTO } from "../dtos/mappers.ts";

/**
 * Añade una nueva subtarea a una tarea existente.
 */
export class AddSubtask {
  constructor(private readonly taskRepository: ITaskRepository) {}

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
    return subtaskToDTO(subtask);
  }
}
