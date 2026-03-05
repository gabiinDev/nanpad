/**
 * Interfaz de base de datos agnóstica de la plataforma.
 * El core define el contrato; la implementación concreta (SqliteAdapter)
 * vive en apps/app y usa @tauri-apps/plugin-sql.
 */

/**
 * Contrato mínimo que los repositorios del core esperan de la base de datos.
 * Compatible con la API de @tauri-apps/plugin-sql sin importarla.
 */
export interface IDatabase {
  /**
   * Ejecuta una sentencia SQL que no retorna filas (INSERT, UPDATE, DELETE, CREATE).
   * @param query - Sentencia SQL con placeholders `$1`, `$2`, etc.
   * @param bindValues - Valores a sustituir en los placeholders.
   */
  execute(query: string, bindValues?: unknown[]): Promise<{ rowsAffected: number }>;

  /**
   * Ejecuta una sentencia SELECT y retorna las filas resultantes.
   * @param query - Sentencia SQL con placeholders `$1`, `$2`, etc.
   * @param bindValues - Valores a sustituir en los placeholders.
   * @returns Array tipado con las filas encontradas.
   */
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
}
