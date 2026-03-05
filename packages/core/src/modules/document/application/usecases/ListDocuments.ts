/**
 * UseCase: Listar documentos (solo metadata, sin contenido Markdown).
 */

import type { IDocumentRepository } from "../../infrastructure/persistence/DocumentRepository.ts";
import type { ListDocumentsInput, DocumentDTO } from "../dtos/DocumentDTO.ts";
import { documentToDTO } from "../dtos/mappers.ts";

/**
 * Lista todos los documentos disponibles con filtro opcional por título.
 * No incluye el contenido Markdown para mantener la respuesta ligera.
 */
export class ListDocuments {
  constructor(private readonly documentRepository: IDocumentRepository) {}

  /**
   * @param input - Filtros opcionales (texto en título).
   * @returns Array de DocumentDTO ordenados por fecha de actualización descendente.
   */
  async execute(input: ListDocumentsInput = {}): Promise<DocumentDTO[]> {
    const docs = await this.documentRepository.findAll(
      input.text ? { text: input.text } : undefined
    );
    return docs.map(documentToDTO);
  }
}
