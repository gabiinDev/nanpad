/**
 * Funciones de mapeo entre entidades de dominio y DTOs del módulo Document.
 */

import type { Document } from "../../domain/entities/Document.ts";
import type { DocumentDTO, DocumentWithContentDTO } from "./DocumentDTO.ts";

/**
 * Convierte un Document a su DTO de metadata (sin contenido).
 * @param doc - Entidad de dominio.
 * @returns DTO serializable con metadata del documento.
 */
export function documentToDTO(doc: Document): DocumentDTO {
  return {
    id: doc.id,
    title: doc.title,
    contentHash: doc.contentHash,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * Convierte un Document a su DTO completo con contenido.
 * @param doc - Entidad de dominio (debe tener `content` no nulo).
 * @returns DTO con contenido Markdown incluido.
 */
export function documentToContentDTO(doc: Document): DocumentWithContentDTO {
  return {
    id: doc.id,
    title: doc.title,
    contentHash: doc.contentHash,
    content: doc.content ?? "",
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
