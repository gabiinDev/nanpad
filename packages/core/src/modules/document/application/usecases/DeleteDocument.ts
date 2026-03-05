/**
 * UseCase: Eliminar un documento y su contenido.
 */

import type { IDocumentRepository } from "../../infrastructure/persistence/DocumentRepository.ts";
import type { IEventBus } from "@shared/event-bus/types.ts";
import { createEvent } from "@shared/event-bus/EventBus.ts";

/**
 * Elimina un documento de forma permanente junto con su contenido.
 * Emite el evento "document.deleted" al finalizar.
 */
export class DeleteDocument {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * @param documentId - ID del documento a eliminar.
   * @throws {Error} Si el documento no existe.
   */
  async execute(documentId: string): Promise<void> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new Error(`[DeleteDocument] Documento no encontrado: ${documentId}`);
    }

    await this.documentRepository.delete(documentId);

    this.eventBus.emitAsync(
      createEvent("document.deleted", { documentId })
    );
  }
}
