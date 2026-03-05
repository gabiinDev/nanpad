/**
 * Value Object que representa la prioridad de una tarea.
 * Coincide con los valores numéricos del esquema SQLite (columna `priority`).
 */

/** Valores numéricos válidos para la prioridad. */
export type PriorityValue = 0 | 1 | 2 | 3;

/** Etiquetas legibles de cada nivel de prioridad. */
export const PRIORITY_LABELS: Record<PriorityValue, string> = {
  0: "low",
  1: "medium",
  2: "high",
  3: "critical",
};

/**
 * Value Object inmutable para la prioridad de una tarea.
 */
export class Priority {
  private constructor(private readonly _value: PriorityValue) {}

  /** Valor numérico de la prioridad. */
  get value(): PriorityValue {
    return this._value;
  }

  /** Etiqueta legible de la prioridad. */
  get label(): string {
    return PRIORITY_LABELS[this._value];
  }

  /**
   * Crea una Priority a partir de un número.
   * @param value - Valor numérico (0–3).
   * @throws {Error} Si el valor no es un número válido.
   */
  static from(value: number): Priority {
    if (value !== 0 && value !== 1 && value !== 2 && value !== 3) {
      throw new Error(
        `[Priority] Valor inválido: ${value}. Debe ser 0 (low), 1 (medium), 2 (high) o 3 (critical).`
      );
    }
    return new Priority(value as PriorityValue);
  }

  static readonly LOW = new Priority(0);
  static readonly MEDIUM = new Priority(1);
  static readonly HIGH = new Priority(2);
  static readonly CRITICAL = new Priority(3);

  equals(other: Priority): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this.label;
  }
}
