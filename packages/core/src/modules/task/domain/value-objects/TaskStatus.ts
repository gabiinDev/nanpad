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
   * Todas las transiciones entre estados distintos están permitidas.
   * @param next - Estado al que se quiere mover.
   */
  canTransitionTo(next: TaskStatus): boolean {
    return !this.equals(next);
  }

  equals(other: TaskStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
