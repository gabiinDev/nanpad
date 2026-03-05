/**
 * Entidad de dominio CodeSnippet.
 * Representa un fragmento de código adjunto a una tarea,
 * capturado desde el editor Monaco.
 */

import { generateId, type EntityId } from "@shared/types/id.ts";

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
   * @param props - Datos del fragmento de código.
   * @throws {Error} Si el contenido está vacío.
   */
  static create(props: CreateCodeSnippetProps): CodeSnippet {
    if (!props.content.trim()) {
      throw new Error("[CodeSnippet] El contenido no puede estar vacío.");
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
