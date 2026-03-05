/**
 * UseCase: Actualizar título y/o contenido de un documento existente.
 */

import type { IDocumentRepository } from "../../infrastructure/persistence/DocumentRepository.ts";
import type { IEventBus } from "@shared/event-bus/types.ts";
import { createEvent } from "@shared/event-bus/EventBus.ts";
import type { UpdateDocumentInput, DocumentWithContentDTO } from "../dtos/DocumentDTO.ts";
import { documentToContentDTO } from "../dtos/mappers.ts";

/**
 * Actualiza un documento existente.
 * Emite el evento "document.updated" al finalizar.
 */
export class UpdateDocument {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * @param input - ID y campos a actualizar.
   * @returns DTO completo del documento actualizado.
   * @throws {Error} Si el documento no existe o el título resultante está vacío.
   */
  async execute(input: UpdateDocumentInput): Promise<DocumentWithContentDTO> {
    const doc = await this.documentRepository.findById(input.id);
    if (!doc) {
      throw new Error(`[UpdateDocument] Documento no encontrado: ${input.id}`);
    }

    const updated = doc.update({
      title: input.title,
      content: input.content,
    });

    await this.documentRepository.save(updated);

    this.eventBus.emitAsync(
      createEvent("document.updated", { documentId: updated.id })
    );

    return documentToContentDTO(updated);
  }
}
