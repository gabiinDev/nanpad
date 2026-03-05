/**
 * UseCase: Crear un nuevo documento.
 */

import { Document } from "../../domain/entities/Document";
import type { IDocumentRepository } from "../../infrastructure/persistence/DocumentRepository";
import type { IEventBus } from "@shared/event-bus/types";
import { createEvent } from "@shared/event-bus/EventBus";
import type { CreateDocumentInput, DocumentWithContentDTO } from "../dtos/DocumentDTO";
import { documentToContentDTO } from "../dtos/mappers";

/**
 * Crea un nuevo documento y lo persiste.
 * Emite el evento "document.created" al finalizar.
 */
export class CreateDocument {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * @param input - Datos del documento (título obligatorio, contenido opcional).
   * @returns DTO completo del documento creado (con contenido).
   * @throws {Error} Si el título está vacío.
   */
  async execute(input: CreateDocumentInput): Promise<DocumentWithContentDTO> {
    const doc = Document.create({
      title: input.title,
      content: input.content,
    });

    await this.documentRepository.save(doc);

    this.eventBus.emitAsync(
      createEvent("document.created", { documentId: doc.id, title: doc.title })
    );

    return documentToContentDTO(doc);
  }
}
