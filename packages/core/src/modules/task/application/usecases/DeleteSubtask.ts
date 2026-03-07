/**
 * UseCase: eliminar una subtarea.
 */

import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository";
import type { IEventBus } from "@shared/event-bus/types";
import { createEvent } from "@shared/event-bus/EventBus";

export interface DeleteSubtaskInput {
  taskId: string;
  subtaskId: string;
}

/**
 * Elimina una subtarea. La tarea debe existir; la subtarea se borra por id.
 * Emite "task.subtask.removed" para registro en historial.
 * @throws Si la tarea no existe (opcional: no comprobar si la subtarea existe).
 */
export class DeleteSubtask {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(input: DeleteSubtaskInput): Promise<void> {
    const task = await this.taskRepository.findById(input.taskId);
    if (!task) throw new Error(`[DeleteSubtask] Tarea no encontrada: ${input.taskId}`);
    const subtask = task.subtasks.find((s) => s.id === input.subtaskId);
    const title = subtask?.title ?? "";
    await this.taskRepository.deleteSubtask(input.subtaskId);
    this.eventBus.emitAsync(
      createEvent("task.subtask.removed", {
        taskId: input.taskId,
        subtaskId: input.subtaskId,
        title,
      })
    );
  }
}
