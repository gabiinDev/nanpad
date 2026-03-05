/**
 * Tipo Result para operaciones que pueden fallar.
 * Alternativa al uso de excepciones para errores esperados.
 */

/** Resultado exitoso. */
export interface Ok<T> {
  readonly success: true;
  readonly data: T;
}

/** Resultado fallido. */
export interface Err<E = string> {
  readonly success: false;
  readonly error: E;
}

/** Union de Ok y Err. */
export type Result<T, E = string> = Ok<T> | Err<E>;

/**
 * Crea un resultado exitoso.
 * @param data - Valor del resultado.
 */
export function ok<T>(data: T): Ok<T> {
  return { success: true, data };
}

/**
 * Crea un resultado de error.
 * @param error - Descripción o valor del error.
 */
export function err<E = string>(error: E): Err<E> {
  return { success: false, error };
}
