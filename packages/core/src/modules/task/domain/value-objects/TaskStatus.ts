/**
 * Value Object que representa el estado de una tarea.
 * Los valores válidos reflejan el esquema SQLite (columna `status`).
 */

/** Valores permitidos para el estado de una tarea. */
export type TaskStatusValue = "todo" | "in_progress" | "done" | "archived";

const VALID_STATUSES: ReadonlySet<TaskStatusValue> = new Set([
  "todo",
  "in_progress",
  "done",
  "archived",
]);

/**
 * Value Object inmutable para el estado de una tarea.
 * Garantiza que solo se usan valores válidos del dominio.
 */
export class TaskStatus {
  private constructor(private readonly _value: TaskStatusValue) {}

  /** Valor primitivo del estado. */
  get value(): TaskStatusValue {
    return this._value;
  }

  /**
   * Crea un TaskStatus a partir de un string.
   * @param value - Valor del estado.
   * @throws {Error} Si el valor no es un estado válido.
   */
  static from(value: string): TaskStatus {
    if (!VALID_STATUSES.has(value as TaskStatusValue)) {
      throw new Error(
        `[TaskStatus] Valor inválido: "${value}". Valores permitidos: ${[...VALID_STATUSES].join(", ")}`
      );
    }
    return new TaskStatus(value as TaskStatusValue);
  }

  static readonly TODO = new TaskStatus("todo");
  static readonly IN_PROGRESS = new TaskStatus("in_progress");
  static readonly DONE = new TaskStatus("done");
  static readonly ARCHIVED = new TaskStatus("archived");

  /**
   * Verifica si la tarea puede transicionar al estado indicado.
   * Casi todas las transiciones están permitidas; no se permite archived → done.
   * @param next - Estado al que se quiere mover.
   */
  canTransitionTo(next: TaskStatus): boolean {
    if (this.equals(next)) return false;
    // No permitir pasar de archivada directamente a completada.
    if (this._value === "archived" && next._value === "done") return false;
    return true;
  }

  equals(other: TaskStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
