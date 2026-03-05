/**
 * UseCase: Crear una nueva tarea.
 */

import { Task } from "../../domain/entities/Task";
import { Priority } from "../../domain/value-objects/Priority";
import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository";
import type { IEventBus } from "@shared/event-bus/types";
import { createEvent } from "@shared/event-bus/EventBus";
import type { CreateTaskInput, TaskDTO } from "../dtos/TaskDTO";
import { taskToDTO } from "../dtos/mappers";

/**
 * Crea una nueva tarea y la persiste.
 * Emite el evento "task.created" al finalizar.
 */
export class CreateTask {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * @param input - Datos de la tarea a crear.
   * @returns DTO de la tarea creada.
   * @throws {Error} Si el título está vacío.
   */
  async execute(input: CreateTaskInput): Promise<TaskDTO> {
    const task = Task.create({
      title: input.title,
      description: input.description,
      priority: input.priority !== undefined ? Priority.from(input.priority) : undefined,
      categoryIds: input.categoryIds,
      tagIds: input.tagIds,
    });

    await this.taskRepository.save(task);

    this.eventBus.emitAsync(
      createEvent("task.created", { taskId: task.id, title: task.title })
    );

    return taskToDTO(task);
  }
}
