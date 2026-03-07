/**
 * Entidad de dominio CodeSnippet.
 * Representa un fragmento de código adjunto a una tarea,
 * capturado desde el editor Monaco.
 */

import { generateId, type EntityId } from "@shared/types/id";

export interface CodeSnippetProps {
  id: EntityId;
  taskId: EntityId;
  content: string;
  language: string | null;
  filePath: string | null;
  lineStart: number | null;
  lineEnd: number | null;
  createdAt: Date;
}

export interface CreateCodeSnippetProps {
  taskId: EntityId;
  content: string;
  language?: string | null;
  filePath?: string | null;
  lineStart?: number | null;
  lineEnd?: number | null;
}

/**
 * Entidad CodeSnippet — fragmento de código asociado a una Task.
 */
export class CodeSnippet {
  readonly id: EntityId;
  readonly taskId: EntityId;
  readonly content: string;
  readonly language: string | null;
  readonly filePath: string | null;
  readonly lineStart: number | null;
  readonly lineEnd: number | null;
  readonly createdAt: Date;

  private constructor(props: CodeSnippetProps) {
    this.id = props.id;
    this.taskId = props.taskId;
    this.content = props.content;
    this.language = props.language;
    this.filePath = props.filePath;
    this.lineStart = props.lineStart;
    this.lineEnd = props.lineEnd;
    this.createdAt = props.createdAt;
  }

  /**
   * Crea un nuevo CodeSnippet.
   * El contenido puede estar vacío cuando se adjunta un archivo completo (solo filePath).
   * @param props - Datos del fragmento de código.
   * @throws {Error} Si el contenido está vacío y no se proporciona filePath.
   */
  static create(props: CreateCodeSnippetProps): CodeSnippet {
    const hasContent = props.content != null && props.content.trim().length > 0;
    const hasFilePath = props.filePath != null && props.filePath.trim().length > 0;
    if (!hasContent && !hasFilePath) {
      throw new Error("[CodeSnippet] Se requiere contenido o filePath.");
    }
    return new CodeSnippet({
      id: generateId(),
      taskId: props.taskId,
      content: props.content,
      language: props.language ?? null,
      filePath: props.filePath ?? null,
      lineStart: props.lineStart ?? null,
      lineEnd: props.lineEnd ?? null,
      createdAt: new Date(),
    });
  }

  /** Reconstruye un CodeSnippet desde persistencia. */
  static reconstitute(props: CodeSnippetProps): CodeSnippet {
    return new CodeSnippet(props);
  }
}
