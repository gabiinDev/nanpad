/**
 * UseCase: Eliminar un fragmento de código adjunto de una tarea.
 * Usado cuando el archivo físico ya no existe y el usuario confirma quitar el adjunto.
 */

import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository";
import type { IEventBus } from "@shared/event-bus/types";
import { createEvent } from "@shared/event-bus/EventBus";
import type { EntityId } from "@shared/types/id";

/**
 * Elimina un fragmento de código adjunto.
 * Necesita taskId y filePath para el historial; el llamador debe proporcionarlos si quiere registro.
 */
export interface DeleteCodeSnippetInput {
  snippetId: EntityId;
  taskId?: string;
  filePath?: string | null;
}

/**
 * Elimina un fragmento de código adjunto.
 * Si se proporciona taskId, emite "task.attachment.removed" para historial.
 */
export class DeleteCodeSnippet {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(input: DeleteCodeSnippetInput | EntityId): Promise<void> {
    const snippetId = typeof input === "string" ? input : input.snippetId;
    const taskId = typeof input === "string" ? undefined : input.taskId;
    const filePath = typeof input === "string" ? undefined : input.filePath;

    if (taskId != null) {
      this.eventBus.emitAsync(
        createEvent("task.attachment.removed", {
          taskId,
          snippetId,
          filePath: filePath ?? null,
        })
      );
    }
    await this.taskRepository.deleteCodeSnippet(snippetId);
  }
}
