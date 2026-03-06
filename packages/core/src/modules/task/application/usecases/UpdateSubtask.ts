/**
 * UseCase: actualizar una subtarea (título o estado completado).
 */

import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository";
import type { SubtaskDTO } from "../dtos/TaskDTO";
import { subtaskToDTO } from "../dtos/mappers";

export interface UpdateSubtaskInput {
  taskId: string;
  subtaskId: string;
  title?: string;
  completed?: boolean;
}

/**
 * Actualiza una subtarea existente (título y/o completado).
 * @throws Si la tarea o la subtarea no existen.
 */
export class UpdateSubtask {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(input: UpdateSubtaskInput): Promise<SubtaskDTO> {
    const task = await this.taskRepository.findById(input.taskId);
    if (!task) throw new Error(`[UpdateSubtask] Tarea no encontrada: ${input.taskId}`);

    const subtask = task.subtasks.find((s) => s.id === input.subtaskId);
    if (!subtask) throw new Error(`[UpdateSubtask] Subtarea no encontrada: ${input.subtaskId}`);

    let updated = subtask;
    if (input.title !== undefined) updated = updated.rename(input.title);
    if (input.completed !== undefined) {
      while (updated.completed !== input.completed) updated = updated.toggle();
    }

    await this.taskRepository.saveSubtask(updated);
    return subtaskToDTO(updated);
  }
}
