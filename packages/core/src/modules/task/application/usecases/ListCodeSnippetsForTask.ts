/**
 * UseCase: Listar fragmentos de código adjuntos a una tarea.
 * Usado para mostrar adjuntos como links en el formulario de tarea.
 */

import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository";
import type { CodeSnippetDTO } from "../dtos/TaskDTO";
import { codeSnippetToDTO } from "../dtos/mappers";

/**
 * Lista los fragmentos de código adjuntos a una tarea.
 * @param taskId - ID de la tarea.
 * @returns Array de CodeSnippetDTO.
 */
export class ListCodeSnippetsForTask {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(taskId: string): Promise<CodeSnippetDTO[]> {
    const snippets = await this.taskRepository.findCodeSnippets(taskId);
    return snippets.map(codeSnippetToDTO);
  }
}
