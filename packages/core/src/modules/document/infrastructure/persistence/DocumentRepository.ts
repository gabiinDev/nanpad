/**
 * Interfaz del repositorio de documentos.
 * Define el contrato de persistencia para el módulo Document.
 */

import type { Document } from "../../domain/entities/Document.ts";
import type { EntityId } from "@shared/types/id.ts";

/** Filtros para buscar documentos. */
export interface DocumentFilters {
  /** Filtra por texto en el título (búsqueda parcial). */
  text?: string;
}

/**
 * Contrato del repositorio de documentos.
 * El contenido se almacena en `document_content` (tabla separada).
 * Todas las operaciones son asíncronas.
 */
export interface IDocumentRepository {
  /**
   * Guarda un documento nuevo o actualiza uno existente.
   * Persiste metadata en `documents` y contenido en `document_content`.
   * @param doc - Entidad Document a persistir.
   */
  save(doc: Document): Promise<void>;

  /**
   * Busca un documento por ID incluyendo su contenido completo.
   * @param id - ID del documento.
   * @returns El documento con contenido o null si no existe.
   */
  findById(id: EntityId): Promise<Document | null>;

  /**
   * Lista documentos (solo metadata, sin contenido).
   * @param filters - Filtros opcionales.
   * @returns Array de documentos sin campo `content`.
   */
  findAll(filters?: DocumentFilters): Promise<Document[]>;

  /**
   * Elimina un documento y su contenido asociado.
   * @param id - ID del documento a eliminar.
   */
  delete(id: EntityId): Promise<void>;
}
