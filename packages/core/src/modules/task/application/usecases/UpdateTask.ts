/**
 * UseCase: Actualizar campos de una tarea existente.
 */

import { Priority } from "../../domain/value-objects/Priority";
import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository";
import type { IEventBus } from "@shared/event-bus/types";
import { createEvent } from "@shared/event-bus/EventBus";
import type { UpdateTaskInput, TaskDTO } from "../dtos/TaskDTO";
import { taskToDTO } from "../dtos/mappers";

/**
 * Actualiza los campos de una tarea existente.
 * Emite el evento "task.updated" al finalizar.
 */
export class UpdateTask {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * @param input - Campos a actualizar (solo los presentes se modifican).
   * @returns DTO de la tarea actualizada.
   * @throws {Error} Si la tarea no existe o el título resultante está vacío.
   */
  async execute(input: UpdateTaskInput): Promise<TaskDTO> {
    const task = await this.taskRepository.findById(input.id);
    if (!task) throw new Error(`[UpdateTask] Tarea no encontrada: ${input.id}`);

    const updated = task.update({
      title: input.title,
      description: input.description,
      priority: input.priority !== undefined ? Priority.from(input.priority) : undefined,
      categoryIds: input.categoryIds,
      tagIds: input.tagIds,
      sortOrder: input.sortOrder,
      documentId: input.documentId,
    });

    await this.taskRepository.save(updated);

    const changedFields = Object.keys(input).filter(
      (k) => k !== "id" && input[k as keyof UpdateTaskInput] !== undefined
    );

    this.eventBus.emitAsync(
      createEvent("task.updated", { taskId: updated.id, fields: changedFields })
    );

    return taskToDTO(updated);
  }
}
