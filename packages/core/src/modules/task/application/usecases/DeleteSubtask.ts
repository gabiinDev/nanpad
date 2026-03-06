/**
 * UseCase: eliminar una subtarea.
 */

import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository";

export interface DeleteSubtaskInput {
  taskId: string;
  subtaskId: string;
}

/**
 * Elimina una subtarea. La tarea debe existir; la subtarea se borra por id.
 * @throws Si la tarea no existe (opcional: no comprobar si la subtarea existe).
 */
export class DeleteSubtask {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(input: DeleteSubtaskInput): Promise<void> {
    const task = await this.taskRepository.findById(input.taskId);
    if (!task) throw new Error(`[DeleteSubtask] Tarea no encontrada: ${input.taskId}`);
    await this.taskRepository.deleteSubtask(input.subtaskId);
  }
}
