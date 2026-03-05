/**
 * Entidad de dominio Task.
 * Contiene la lógica de negocio pura; no conoce SQLite ni React.
 */

import { generateId, type EntityId } from "@shared/types/id";
import { TaskStatus } from "../value-objects/TaskStatus";
import { Priority } from "../value-objects/Priority";
import type { Subtask } from "./Subtask";

/** Props para reconstruir una Task desde persistencia. */
export interface TaskProps {
  id: EntityId;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  sortOrder: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  documentId: EntityId | null;
  categoryIds: EntityId[];
  tagIds: EntityId[];
  subtasks: Subtask[];
}

/** Datos mínimos para crear una nueva Task. */
export interface CreateTaskProps {
  title: string;
  description?: string | null;
  priority?: Priority;
  categoryIds?: EntityId[];
  tagIds?: EntityId[];
}

/**
 * Entidad Task — núcleo del módulo de tareas.
 * Inmutable externamente; los métodos retornan nuevas instancias.
 */
export class Task {
  readonly id: EntityId;
  readonly title: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly priority: Priority;
  readonly sortOrder: number;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly documentId: EntityId | null;
  readonly categoryIds: ReadonlyArray<EntityId>;
  readonly tagIds: ReadonlyArray<EntityId>;
  readonly subtasks: ReadonlyArray<Subtask>;

  private constructor(props: TaskProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.status = props.status;
    this.priority = props.priority;
    this.sortOrder = props.sortOrder;
    this.completedAt = props.completedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.documentId = props.documentId;
    this.categoryIds = Object.freeze([...props.categoryIds]);
    this.tagIds = Object.freeze([...props.tagIds]);
    this.subtasks = Object.freeze([...props.subtasks]);
  }

  /**
   * Crea una nueva Task con valores por defecto.
   * @param props - Datos mínimos de la tarea.
   * @returns Nueva instancia de Task con ID generado y estado "todo".
   * @throws {Error} Si el título está vacío.
   */
  static create(props: CreateTaskProps): Task {
    const title = props.title.trim();
    if (!title) throw new Error("[Task] El título no puede estar vacío.");

    const now = new Date();
    return new Task({
      id: generateId(),
      title,
      description: props.description ?? null,
      status: TaskStatus.TODO,
      priority: props.priority ?? Priority.MEDIUM,
      sortOrder: 0,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      documentId: null,
      categoryIds: props.categoryIds ?? [],
      tagIds: props.tagIds ?? [],
      subtasks: [],
    });
  }

  /**
   * Reconstruye una Task desde los datos de persistencia.
   * @param props - Props completos desde el repositorio.
   */
  static reconstitute(props: TaskProps): Task {
    return new Task(props);
  }

  /**
   * Retorna una nueva Task con los campos actualizados.
   * @param changes - Campos a modificar.
   * @throws {Error} Si el título resultante está vacío.
   */
  update(changes: Partial<Pick<TaskProps, "title" | "description" | "priority" | "categoryIds" | "tagIds" | "documentId" | "sortOrder">>): Task {
    const newTitle = (changes.title ?? this.title).trim();
    if (!newTitle) throw new Error("[Task] El título no puede estar vacío.");

    return new Task({
      id: this.id,
      title: newTitle,
      description: changes.description !== undefined ? changes.description : this.description,
      status: this.status,
      priority: changes.priority ?? this.priority,
      sortOrder: changes.sortOrder ?? this.sortOrder,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      documentId: changes.documentId !== undefined ? changes.documentId : this.documentId,
      categoryIds: changes.categoryIds ?? [...this.categoryIds],
      tagIds: changes.tagIds ?? [...this.tagIds],
      subtasks: [...this.subtasks],
    });
  }

  /**
   * Mueve la tarea a un nuevo estado.
   * @param newStatus - Estado destino.
   * @throws {Error} Si la transición no está permitida.
   */
  moveToStatus(newStatus: TaskStatus): Task {
    if (!this.status.canTransitionTo(newStatus)) {
      throw new Error(
        `[Task] Transición inválida: "${this.status.value}" → "${newStatus.value}".`
      );
    }

    const completedAt =
      newStatus.value === "done" ? new Date() : this.completedAt;
    const restoredCompletedAt =
      newStatus.value === "todo" ? null : completedAt;

    return new Task({
      id: this.id,
      title: this.title,
      description: this.description,
      status: newStatus,
      priority: this.priority,
      sortOrder: this.sortOrder,
      completedAt: restoredCompletedAt,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      documentId: this.documentId,
      categoryIds: [...this.categoryIds],
      tagIds: [...this.tagIds],
      subtasks: [...this.subtasks],
    });
  }

  /**
   * Marca la tarea como completada (estado "done").
   * @throws {Error} Si la tarea ya está completada o archivada.
   */
  complete(): Task {
    if (this.status.value === "done") {
      throw new Error("[Task] La tarea ya está completada.");
    }
    return this.moveToStatus(TaskStatus.DONE);
  }

  /**
   * Restaura la tarea al estado "todo".
   */
  restore(): Task {
    return this.moveToStatus(TaskStatus.TODO);
  }

  /** Indica si la tarea está completada. */
  get isCompleted(): boolean {
    return this.status.value === "done";
  }

  /** Indica si la tarea está archivada. */
  get isArchived(): boolean {
    return this.status.value === "archived";
  }
}
