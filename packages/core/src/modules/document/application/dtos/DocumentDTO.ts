/**
 * DTOs del módulo Document.
 * Contrato público entre este módulo y el resto de la aplicación.
 */

/** DTO de metadata de un documento (sin contenido). Usado en ListDocuments. */
export interface DocumentDTO {
  id: string;
  title: string;
  contentHash: string | null;
  createdAt: string;
  updatedAt: string;
}

/** DTO de un documento con su contenido completo. Usado en GetDocument. */
export interface DocumentWithContentDTO extends DocumentDTO {
  content: string;
}

/** Input para CreateDocument. */
export interface CreateDocumentInput {
  title: string;
  content?: string;
}

/** Input para UpdateDocument. */
export interface UpdateDocumentInput {
  id: string;
  title?: string;
  content?: string;
}

/** Input para GetDocument. */
export interface GetDocumentInput {
  id: string;
}

/** Filtros para ListDocuments. */
export interface ListDocumentsInput {
  /** Filtra por texto en el título. */
  text?: string;
}
