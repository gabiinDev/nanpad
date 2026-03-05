/**
 * Gestor de migraciones de la base de datos NANPAD.
 * Completamente agnóstico de Tauri: recibe IDatabase por inyección.
 * La apertura de la conexión ocurre en apps/app (SqliteAdapter).
 */

import type { IDatabase } from "./IDatabase.ts";

/**
 * Ejecuta todas las migraciones pendientes sobre la base de datos proporcionada.
 * Debe llamarse una vez desde el Composition Root tras abrir la conexión.
 * @param db - Instancia de base de datos que implementa IDatabase.
 */
export async function runMigrations(db: IDatabase): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const rows = await db.select<{ version: number | null }[]>(
    "SELECT MAX(version) as version FROM schema_version"
  );
  const currentVersion: number = rows[0]?.version ?? 0;

  const migrations: MigrationFn[] = [migration001];

  for (let i = currentVersion; i < migrations.length; i++) {
    await migrations[i](db);
    console.info(`[DB] Migración ${i + 1} aplicada.`);
  }
}

/** Función de migración. */
type MigrationFn = (db: IDatabase) => Promise<void>;

/**
 * Migración 001: Esquema inicial completo de NANPAD.
 */
async function migration001(db: IDatabase): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT REFERENCES categories(id),
      color TEXT,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      document_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS task_categories (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, category_id)
    )`,
    `CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    )`,
    `CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS task_code_snippets (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      language TEXT,
      file_path TEXT,
      line_start INTEGER,
      line_end INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      file_path TEXT,
      content_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS document_content (
      document_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS history_entries (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at)`,
    `CREATE INDEX IF NOT EXISTS idx_task_categories_category ON task_categories(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id)`,
    `CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id)`,
    `CREATE INDEX IF NOT EXISTS idx_history_entity ON history_entries(entity_type, entity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_history_created ON history_entries(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at)`,
    `INSERT OR IGNORE INTO schema_version (version) VALUES (1)`,
  ];

  for (const sql of statements) {
    await db.execute(sql);
  }
}
