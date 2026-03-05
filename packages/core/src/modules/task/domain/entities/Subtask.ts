/**
 * Entidad de dominio Subtask.
 * Representa una subtarea asociada a una Task principal.
 */

import { generateId, type EntityId } from "@shared/types/id";

export interface SubtaskProps {
  id: EntityId;
  taskId: EntityId;
  title: string;
  completed: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubtaskProps {
  taskId: EntityId;
  title: string;
  sortOrder?: number;
}

/**
 * Entidad Subtask — tarea secundaria anidada en una Task.
 */
export class Subtask {
  readonly id: EntityId;
  readonly taskId: EntityId;
  readonly title: string;
  readonly completed: boolean;
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SubtaskProps) {
    this.id = props.id;
    this.taskId = props.taskId;
    this.title = props.title;
    this.completed = props.completed;
    this.sortOrder = props.sortOrder;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Crea una nueva Subtask.
   * @param props - Datos mínimos.
   * @throws {Error} Si el título está vacío.
   */
  static create(props: CreateSubtaskProps): Subtask {
    const title = props.title.trim();
    if (!title) throw new Error("[Subtask] El título no puede estar vacío.");

    const now = new Date();
    return new Subtask({
      id: generateId(),
      taskId: props.taskId,
      title,
      completed: false,
      sortOrder: props.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reconstruye una Subtask desde persistencia. */
  static reconstitute(props: SubtaskProps): Subtask {
    return new Subtask(props);
  }

  /** Retorna una nueva Subtask con el estado de completado invertido. */
  toggle(): Subtask {
    return new Subtask({ ...this, completed: !this.completed, updatedAt: new Date() });
  }

  /** Retorna una nueva Subtask con el título actualizado. */
  rename(newTitle: string): Subtask {
    const title = newTitle.trim();
    if (!title) throw new Error("[Subtask] El título no puede estar vacío.");
    return new Subtask({ ...this, title, updatedAt: new Date() });
  }
}
