/**
 * Interfaz del repositorio de preferencias de aplicación.
 * Define el contrato de persistencia; la implementación SQLite está en sqlite/.
 */

/**
 * Contrato del repositorio de preferencias.
 * Almacena pares clave-valor (string).
 */
export interface IAppSettingsRepository {
  /**
   * Obtiene todas las preferencias como mapa clave → valor.
   * Claves no presentes pueden omitirse; el UseCase aplica valores por defecto.
   */
  getAll(): Promise<Record<string, string>>;

  /**
   * Guarda una preferencia. Valor siempre como string (el UseCase convierte boolean).
   */
  set(key: string, value: string): Promise<void>;
}
