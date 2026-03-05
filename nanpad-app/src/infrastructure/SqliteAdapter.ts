/**
 * Adaptador SQLite para la app Tauri.
 * Implementa IDatabase del core usando @tauri-apps/plugin-sql.
 * Es el único archivo de la app que conoce el plugin de Tauri para SQL.
 */

import Database from "@tauri-apps/plugin-sql";
import type { IDatabase } from "@nanpad/core";

/**
 * Implementación de IDatabase sobre @tauri-apps/plugin-sql.
 * Instanciar desde el Composition Root (main.tsx / App.tsx) e inyectar
 * en los repositorios y en runMigrations.
 */
export class SqliteAdapter implements IDatabase {
  private constructor(private readonly db: Database) {}

  /**
   * Abre la conexión SQLite y retorna un adaptador listo para usar.
   * @param path - Ruta SQLite, por ejemplo "sqlite:nanpad.db".
   */
  static async open(path = "sqlite:nanpad.db"): Promise<SqliteAdapter> {
    const db = await Database.load(path);
    return new SqliteAdapter(db);
  }

  /** @inheritdoc */
  async execute(
    query: string,
    bindValues?: unknown[]
  ): Promise<{ rowsAffected: number }> {
    return this.db.execute(query, bindValues);
  }

  /** @inheritdoc */
  async select<T>(query: string, bindValues?: unknown[]): Promise<T> {
    return this.db.select<T>(query, bindValues);
  }
}
