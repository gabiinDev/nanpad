/**
 * Entidad de dominio Document.
 * El contenido Markdown se almacena en la tabla `document_content` (en DB).
 * La entidad de dominio transporta el contenido opcionalmente; solo presente
 * cuando se hace un GetDocument (no en ListDocuments).
 */

import { generateId, type EntityId } from "@shared/types/id.ts";

/** Props para reconstruir un Document desde persistencia. */
export interface DocumentProps {
  id: EntityId;
  title: string;
  /** Hash SHA-simple del contenido para detectar cambios sin leer el texto. */
  contentHash: string | null;
  /** Contenido Markdown; puede ser null cuando solo se lista metadata. */
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Datos mínimos para crear un nuevo Document. */
export interface CreateDocumentProps {
  title: string;
  content?: string;
}

/**
 * Entidad Document.
 * Representa un documento Markdown editable con Monaco.
 * Inmutable externamente; los métodos retornan nuevas instancias.
 */
export class Document {
  readonly id: EntityId;
  readonly title: string;
  readonly contentHash: string | null;
  readonly content: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: DocumentProps) {
    this.id = props.id;
    this.title = props.title;
    this.contentHash = props.contentHash;
    this.content = props.content;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Crea un nuevo Document con valores por defecto.
   * @param props - Datos mínimos del documento.
   * @returns Nueva instancia con ID generado y contenido vacío si no se indica.
   * @throws {Error} Si el título está vacío.
   */
  static create(props: CreateDocumentProps): Document {
    const title = props.title.trim();
    if (!title) throw new Error("[Document] El título no puede estar vacío.");

    const content = props.content ?? "";
    const now = new Date();

    return new Document({
      id: generateId(),
      title,
      contentHash: computeHash(content),
      content,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstruye un Document desde los datos de persistencia.
   * @param props - Props completos desde el repositorio.
   */
  static reconstitute(props: DocumentProps): Document {
    return new Document(props);
  }

  /**
   * Retorna un nuevo Document con el título y/o contenido actualizados.
   * @param changes - Campos a modificar.
   * @throws {Error} Si el título resultante está vacío.
   */
  update(changes: { title?: string; content?: string }): Document {
    const newTitle = (changes.title ?? this.title).trim();
    if (!newTitle) throw new Error("[Document] El título no puede estar vacío.");

    const newContent =
      changes.content !== undefined ? changes.content : (this.content ?? "");

    return new Document({
      id: this.id,
      title: newTitle,
      contentHash: computeHash(newContent),
      content: newContent,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  /**
   * Retorna una versión del documento sin contenido (solo metadata).
   * Útil para listados donde el contenido no es necesario.
   */
  withoutContent(): Document {
    return new Document({
      id: this.id,
      title: this.title,
      contentHash: this.contentHash,
      content: null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }
}

/**
 * Calcula un hash simple (djb2) del contenido para detectar cambios.
 * No requiere criptografía; solo es para comparación rápida.
 * @param content - Texto a hashear.
 */
function computeHash(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
    hash = hash >>> 0; // mantener como unsigned 32-bit
  }
  return hash.toString(16);
}
