/**
 * UseCase: Adjuntar un fragmento de código a una tarea.
 * Permite capturar selecciones del editor Monaco y asociarlas a una tarea.
 */

import { CodeSnippet } from "../../domain/entities/CodeSnippet.ts";
import type { ITaskRepository } from "../../infrastructure/persistence/TaskRepository.ts";
import type { AttachCodeToTaskInput, CodeSnippetDTO } from "../dtos/TaskDTO.ts";
import { codeSnippetToDTO } from "../dtos/mappers.ts";

/**
 * Adjunta un fragmento de código a una tarea existente.
 */
export class AttachCodeToTask {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * @param input - Datos del fragmento de código y ID de la tarea.
   * @returns DTO del snippet creado.
   * @throws {Error} Si la tarea no existe o el contenido está vacío.
   */
  async execute(input: AttachCodeToTaskInput): Promise<CodeSnippetDTO> {
    const task = await this.taskRepository.findById(input.taskId);
    if (!task) {
      throw new Error(`[AttachCodeToTask] Tarea no encontrada: ${input.taskId}`);
    }

    const snippet = CodeSnippet.create({
      taskId: input.taskId,
      content: input.content,
      language: input.language,
      filePath: input.filePath,
      lineStart: input.lineStart,
      lineEnd: input.lineEnd,
    });

    await this.taskRepository.saveCodeSnippet(snippet);
    return codeSnippetToDTO(snippet);
  }
}
