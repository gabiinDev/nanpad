/**
 * UseCase: Eliminar un fragmento de código adjunto de una tarea.
 * Usado cuando el archivo físico ya no existe y el usuario confirma quitar el adjunto.
 */

import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository";
import type { EntityId } from "@shared/types/id";

/**
 * Elimina un fragmento de código adjunto.
 */
export class DeleteCodeSnippet {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(snippetId: EntityId): Promise<void> {
    await this.taskRepository.deleteCodeSnippet(snippetId);
  }
}
