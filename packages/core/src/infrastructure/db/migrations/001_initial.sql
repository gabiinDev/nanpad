-- ============================================================
-- NANPAD — Migración inicial (versión 1)
-- Crea todas las tablas del esquema de base de datos.
-- ============================================================

-- Versión del esquema (para migraciones e import/export)
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Categorías (con jerarquía opcional padre/hijo)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES categories(id),
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Etiquetas (tags) globales reutilizables en tareas
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tareas principales
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  -- Valores de status: todo | in_progress | done | archived
  priority INTEGER NOT NULL DEFAULT 1,
  -- Valores de priority: 0=low | 1=medium | 2=high | 3=critical
  sort_order INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  document_id TEXT  -- enlace opcional a documento asociado
);

-- Relación tarea <-> categorías (N:M)
CREATE TABLE IF NOT EXISTS task_categories (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, category_id)
);

-- Relación tarea <-> etiquetas (N:M)
CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Subtareas
CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fragmentos de código adjuntos a tareas (selección desde el editor)
CREATE TABLE IF NOT EXISTS task_code_snippets (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  language TEXT,
  file_path TEXT,
  line_start INTEGER,
  line_end INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Documentos (metadata; contenido en document_content o en archivos .md)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_path TEXT,        -- ruta relativa si se guarda como .md
  content_hash TEXT,     -- hash para detectar cambios sin leer todo el contenido
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contenido de documentos almacenado en la base de datos
CREATE TABLE IF NOT EXISTS document_content (
  document_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Historial de cambios genérico (todas las entidades)
CREATE TABLE IF NOT EXISTS history_entries (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,  -- 'task' | 'document' | 'category' | etc.
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,       -- 'create' | 'update' | 'delete' | 'complete'
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Índices para consultas frecuentes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_task_categories_category ON task_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_history_entity ON history_entries(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON history_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at);

-- Registrar esta migración
INSERT OR IGNORE INTO schema_version (version) VALUES (1);
