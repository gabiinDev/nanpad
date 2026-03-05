/**
 * UseCase: Obtener un documento completo (con contenido Markdown).
 */

import type { IDocumentRepository } from "../../infrastructure/persistence/DocumentRepository";
import type { GetDocumentInput, DocumentWithContentDTO } from "../dtos/DocumentDTO";
import { documentToContentDTO } from "../dtos/mappers";

/**
 * Recupera un documento por ID incluyendo su contenido completo.
 */
export class GetDocument {
  constructor(private readonly documentRepository: IDocumentRepository) {}

  /**
   * @param input - ID del documento a recuperar.
   * @returns DTO con contenido Markdown.
   * @throws {Error} Si el documento no existe.
   */
  async execute(input: GetDocumentInput): Promise<DocumentWithContentDTO> {
    const doc = await this.documentRepository.findById(input.id);
    if (!doc) {
      throw new Error(`[GetDocument] Documento no encontrado: ${input.id}`);
    }
    return documentToContentDTO(doc);
  }
}
