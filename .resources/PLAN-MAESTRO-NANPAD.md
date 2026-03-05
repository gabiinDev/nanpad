# Plan Maestro NANPAD

**Aplicación local: Gestión de tareas + Documentación técnica**  
**Versión del plan:** 1.0 | **Fecha:** 2026-03-03

Este documento consolida la especificación técnica (docs 1 y 2), define funcionalidades detalladas, esquema de base de datos SQLite, backend, estructura del proyecto, stack UI y un plan paso a paso para ejecutar el proyecto con un agente de IA.

---

## 1. Lista detallada de funcionalidades de la app

### 1.1 Gestión de tareas (Task)

| ID | Funcionalidad | Descripción |
|----|----------------|-------------|
| T01 | Crear tarea | Crear tarea con título, descripción opcional, prioridad, categoría(s), etiquetas. |
| T02 | Editar tarea | Modificar título, descripción, prioridad, categorías, etiquetas. |
| T03 | Categorizar | Asignar una o varias categorías custom a una tarea. |
| T04 | Cambiar estado | Mover tarea entre estados (ej. To Do, In Progress, Done) para vista Kanban. |
| T05 | Marcar completada | Marcar tarea como completada (y opcionalmente archivarla). |
| T06 | Restaurar tarea | Desmarcar completada o restaurar desde archivado. |
| T07 | Subtareas | Añadir/editar/eliminar subtareas con estado propio. |
| T08 | Prioridades | Prioridad: baja, media, alta, crítica (valor numérico o enum). |
| T09 | Etiquetas custom | Etiquetas libres por tarea; filtros por etiqueta. |
| T10 | Filtros dinámicos | Filtrar por categoría, etiqueta, prioridad, estado, texto. |
| T11 | Historial de cambios | Ver historial de cambios de una tarea (quién/cuándo/qué). |
| T12 | Adjuntar código a tarea | Desde el editor: seleccionar líneas de código y adjuntar a una tarea (nueva o existente). |
| T13 | Eventos de cambio | Emitir eventos al crear/editar/completar para Event Bus e integración MCP. |

### 1.2 Categorías (Category)

| ID | Funcionalidad | Descripción |
|----|----------------|-------------|
| C01 | Crear categoría | Nombre, color/icono opcional. |
| C02 | Jerarquías opcionales | Categorías padre/hijo (tree). |
| C03 | Asignación múltiple | Una tarea puede tener varias categorías. |
| C04 | Eliminación segura | Al eliminar categoría: reasignar o desasignar tareas; no borrado en cascada sin confirmación. |
| C05 | Reindexación | Eventos de reindexación cuando cambian categorías (para búsqueda/UI). |

### 1.3 Documentos (Document)

| ID | Funcionalidad | Descripción |
|----|----------------|-------------|
| D01 | Editor Markdown | Editor con Monaco para contenido Markdown. |
| D02 | Soporte Mermaid | Renderizado de diagramas Mermaid en preview. |
| D03 | Vista previa en tiempo real | Split view: editor + preview actualizado (debounced). |
| D04 | Detección por extensión | Preview según tipo: imágenes, código, tablas, etc. |
| D05 | Renderizado de imágenes | Mostrar imágenes embebidas o enlaces. |
| D06 | Preview de código | Syntax highlighting en bloques de código. |
| D07 | Integración Monaco | Autocompletado, temas, atajos; mismo editor que en IDE. |

### 1.4 Historial (History)

| ID | Funcionalidad | Descripción |
|----|----------------|-------------|
| H01 | Registro de cambios | Registrar cada cambio significativo (qué entidad, qué campo, valor anterior/nuevo). |
| H02 | Versionado liviano | Versiones por documento/tarea sin copias completas (deltas o snapshots ligeros). |
| H03 | Undo / Redo | Deshacer/rehacer en editor y en acciones de tareas (scope por contexto). |
| H04 | Registro por entidad | Historial filtrable por entidad (tarea, documento, categoría). |

### 1.5 Almacenamiento (Storage)

| ID | Funcionalidad | Descripción |
|----|----------------|-------------|
| S01 | Persistencia local | Todo en SQLite + archivos locales (JSON/MD) según módulo. |
| S02 | Serialización | Serializar/deserializar estado a JSON para export/backup. |
| S03 | Importación | Importar workspace o módulo desde JSON; validación de versión. |
| S04 | Exportación | Export completo o por módulo; JSON (opcionalmente comprimido). |
| S05 | Backup manual | Punto de restauración manual (copia de DB + archivos). |
| S06 | Backup incremental | Opción de backups incrementales para restauración. |

### 1.6 Integración MCP (Agentes de IA)

| ID | Funcionalidad | Descripción |
|----|----------------|-------------|
| M01 | Crear tareas | El agente puede crear tareas vía API controlada. |
| M02 | Completar tareas | Marcar tareas como completadas. |
| M03 | Consultar estado | Listar tareas, filtros, estado del workspace. |
| M04 | Generar documentos | Crear o actualizar contenido Markdown. |
| M05 | Categorizar automáticamente | Asignar categorías a tareas según contexto. |
| M06 | API controlada | Solo UseCases expuestos; nunca acceso directo al dominio. |

### 1.7 UI/UX

| ID | Funcionalidad | Descripción |
|----|----------------|-------------|
| U01 | UI limpia y minimalista | Diseño claro, sin ruido visual. |
| U02 | Modo oscuro/claro | Tema claro y oscuro con persistencia. |
| U03 | Panel lateral opcional | Sidebar con navegación (tareas, documentos, categorías). |
| U04 | Vista Kanban | Columnas por estado; arrastrar y soltar. |
| U05 | Vista lista | Lista de tareas con ordenación y filtros. |
| U06 | Vista documento expandida | Ver documento a pantalla completa. |
| U07 | Split view | Editor + preview en mismo layout. |
| U08 | Animaciones desactivables | Animaciones suaves; modo “High Performance” las desactiva. |
| U09 | Modo High Performance | Menos efectos, prioridad a velocidad. |

---

## 2. Esquema de base de datos SQLite (tablas)

Se asume **una base de datos SQLite local** por workspace, con migraciones versionadas.

### 2.1 Tablas principales

```sql
-- Versión del esquema (para migraciones e import/export)
CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Categorías (con jerarquía opcional)
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES categories(id),
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Etiquetas (tags) globales para tareas
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tareas
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',  -- todo, in_progress, done, archived
  priority INTEGER NOT NULL DEFAULT 1,   -- 0=low, 1=medium, 2=high, 3=critical
  sort_order INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  document_id TEXT  -- enlace opcional a documento asociado
);

-- Relación tarea <-> categorías (N:M)
CREATE TABLE task_categories (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, category_id)
);

-- Relación tarea <-> etiquetas (N:M)
CREATE TABLE task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Subtareas
CREATE TABLE subtasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fragmentos de código adjuntos a tareas (selección desde editor)
CREATE TABLE task_code_snippets (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  language TEXT,
  file_path TEXT,
  line_start INTEGER,
  line_end INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Documentos (metadata; contenido puede estar en tabla o en archivos)
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_path TEXT,           -- ruta relativa si se guarda como .md
  content_hash TEXT,        -- para detectar cambios sin leer todo
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contenido de documentos (si se guarda en DB; alternativamente solo file_path)
CREATE TABLE document_content (
  document_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Historial de cambios (entidad genérica)
CREATE TABLE history_entries (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,   -- 'task', 'document', 'category', etc.
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,        -- 'create', 'update', 'delete', 'complete'
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para consultas frecuentes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_completed_at ON tasks(completed_at);
CREATE INDEX idx_task_categories_category ON task_categories(category_id);
CREATE INDEX idx_subtasks_task ON subtasks(task_id);
CREATE INDEX idx_history_entity ON history_entries(entity_type, entity_id);
CREATE INDEX idx_history_created ON history_entries(created_at);
CREATE INDEX idx_documents_updated ON documents(updated_at);
```

### 2.2 Notas sobre persistencia

- **IDs**: usar UUIDs (v4) en texto para `id` en todas las tablas.
- **Documentos**: se puede elegir guardar contenido en `document_content` o en archivos `.md` en disco; el plan soporta ambos (hash en `documents` para sincronizar).
- **Export/Import**: exportar tablas relevantes a JSON; en import, validar `schema_version` y ejecutar migraciones si hace falta.

---

## 3. Funcionalidades de backend (por módulo)

El “backend” aquí es la capa de aplicación + dominio + infraestructura dentro del proceso Tauri (sin servidor remoto). Se organiza por módulos; cada uno expone **solo UseCases** vía `application/index.ts`.

### 3.1 Task Module

| UseCase | Entrada | Salida | Persistencia |
|---------|---------|--------|--------------|
| CreateTask | title, description?, priority, categoryIds[], tagIds[] | TaskDTO | INSERT task + task_categories + task_tags |
| UpdateTask | id, campos a actualizar | TaskDTO | UPDATE tasks + relaciones |
| MoveTaskStatus | id, newStatus | TaskDTO | UPDATE tasks.status; emit event |
| CompleteTask | id | TaskDTO | UPDATE tasks (completed_at); event |
| RestoreTask | id | TaskDTO | UPDATE tasks (completed_at=null); event |
| AddSubtask | taskId, title | SubtaskDTO | INSERT subtasks |
| AttachCodeToTask | taskId, content, language?, filePath?, lineStart?, lineEnd? | CodeSnippetDTO | INSERT task_code_snippets |
| GetTaskHistory | taskId | HistoryEntryDTO[] | SELECT history_entries |
| ListTasks | filters (status, category, tag, priority, text) | TaskDTO[] | SELECT con JOINs y filtros |

### 3.2 Category Module

| UseCase | Entrada | Salida | Persistencia |
|---------|---------|--------|--------------|
| CreateCategory | name, parentId?, color?, icon? | CategoryDTO | INSERT categories |
| UpdateCategory | id, name?, parentId?, color?, icon? | CategoryDTO | UPDATE categories |
| DeleteCategory | id, reassignStrategy? | void | Eliminación segura; eventos |
| ListCategories | includeChildren? | CategoryDTO[] | SELECT categories (tree si aplica) |

### 3.3 Document Module

| UseCase | Entrada | Salida | Persistencia |
|---------|---------|--------|--------------|
| CreateDocument | title, content? | DocumentDTO | INSERT documents + document_content (o crear archivo) |
| UpdateDocument | id, title?, content? | DocumentDTO | UPDATE; escribir contenido |
| GetDocument | id | DocumentDTO + content | SELECT + content |
| ListDocuments | — | DocumentDTO[] | SELECT documents |

### 3.4 History Module

| UseCase | Entrada | Salida | Persistencia |
|---------|---------|--------|--------------|
| RecordChange | entityType, entityId, action, fieldName?, oldValue?, newValue? | void | INSERT history_entries |
| GetEntityHistory | entityType, entityId | HistoryEntryDTO[] | SELECT history_entries |
| Undo / Redo | context (document/task), targetId | Result | Depende del contexto; puede leer history y revertir |

### 3.5 Storage Module

| UseCase | Entrada | Salida | Persistencia |
|---------|---------|--------|--------------|
| SaveSnapshot | — | path o blob | Export DB + archivos a JSON/zip |
| LoadSnapshot | path o blob | void | Import; validar versión; migrar si necesario |
| ExportWorkspace | options (full/module) | path o blob | Serializar módulos seleccionados |
| ImportWorkspace | path o blob | void | Validar e importar |
| BackupNow | path? | path | Copia de DB + datos críticos |

### 3.6 MCP Integration Module

| UseCase (expuesto como “API” al agente) | Entrada | Salida |
|----------------------------------------|---------|--------|
| MCP: CreateTask | title, description?, categoryIds? | TaskDTO |
| MCP: CompleteTask | taskId | TaskDTO |
| MCP: ListTasks | filters? | TaskDTO[] |
| MCP: CreateOrUpdateDocument | title, content | DocumentDTO |
| MCP: AssignCategory | taskId, categoryId | TaskDTO |

Todos delegan en los UseCases de Task/Document/Category; no acceden a dominio ni a SQL directamente.

---

## 4. Estructura de carpetas del proyecto

El proyecto usa un **monorepo pnpm workspaces** con dos paquetes:

- **`packages/core`** (`@nanpad/core`): dominio puro, módulos, shared kernel e infraestructura agnóstica. Sin dependencias de Tauri.
- **`nanpad-app`** (`@nanpad/app`): proyecto Tauri + React + UI. Consume `@nanpad/core` como dependencia de workspace.

> **Nota**: La estructura debajo refleja el estado real implementado al 2026-03-03.

```
NANPAD/                              # Raíz del monorepo (workspace root)
├── pnpm-workspace.yaml
├── package.json                     # Scripts orquestadores (dev, build, test)
├── AGENTS.md                        # Instrucciones para agentes IA
├── .cursor/
│   ├── rules/                       # Reglas del proyecto (nanpad-*.mdc)
│   └── skills/                      # Skills del agente
├── .resources/
│   ├── PLAN-MAESTRO-NANPAD.md       # Este documento
│   ├── especificacion-tecnica-nanpad-1.md
│   ├── especificacion-tecnica-nanpad-2.md
│   └── shadcn-reference.css         # Referencia de paleta de colores
│
├── packages/
│   └── core/                        # @nanpad/core — lógica de negocio pura
│       ├── src/
│       │   ├── index.ts             # Punto de entrada público del paquete
│       │   ├── shared/
│       │   │   ├── event-bus/
│       │   │   │   ├── types.ts
│       │   │   │   └── EventBus.ts
│       │   │   ├── types/
│       │   │   │   ├── id.ts        # UUID v4
│       │   │   │   └── result.ts
│       │   │   └── index.ts
│       │   │
│       │   ├── modules/
│       │   │   ├── task/
│       │   │   │   ├── application/
│       │   │   │   │   ├── usecases/
│       │   │   │   │   │   ├── CreateTask.ts
│       │   │   │   │   │   ├── UpdateTask.ts
│       │   │   │   │   │   ├── MoveTaskStatus.ts
│       │   │   │   │   │   ├── CompleteTask.ts
│       │   │   │   │   │   ├── RestoreTask.ts
│       │   │   │   │   │   ├── AddSubtask.ts
│       │   │   │   │   │   ├── AttachCodeToTask.ts
│       │   │   │   │   │   ├── GetTaskHistory.ts
│       │   │   │   │   │   └── ListTasks.ts
│       │   │   │   │   ├── dtos/
│       │   │   │   │   │   ├── TaskDTO.ts
│       │   │   │   │   │   └── mappers.ts
│       │   │   │   │   └── index.ts  # PÚBLICO
│       │   │   │   ├── domain/
│       │   │   │   │   ├── entities/
│       │   │   │   │   │   ├── Task.ts
│       │   │   │   │   │   ├── Subtask.ts
│       │   │   │   │   │   └── CodeSnippet.ts
│       │   │   │   │   └── value-objects/
│       │   │   │   │       ├── TaskStatus.ts
│       │   │   │   │       └── Priority.ts
│       │   │   │   └── infrastructure/
│       │   │   │       └── persistence/
│       │   │   │           ├── TaskRepository.ts
│       │   │   │           └── sqlite/
│       │   │   │               └── TaskSqliteRepository.ts
│       │   │   │
│       │   │   ├── category/
│       │   │   │   ├── application/
│       │   │   │   │   ├── usecases/
│       │   │   │   │   ├── dtos/
│       │   │   │   │   └── index.ts
│       │   │   │   ├── domain/
│       │   │   │   └── infrastructure/
│       │   │   │
│       │   │   ├── document/        # Módulo SQLite (usado por MCP)
│       │   │   │   ├── application/
│       │   │   │   │   ├── usecases/
│       │   │   │   │   ├── dtos/
│       │   │   │   │   └── index.ts
│       │   │   │   ├── domain/
│       │   │   │   └── infrastructure/
│       │   │   │
│       │   │   ├── history/
│       │   │   │   ├── application/
│       │   │   │   │   ├── usecases/
│       │   │   │   │   ├── dtos/
│       │   │   │   │   └── index.ts
│       │   │   │   ├── domain/
│       │   │   │   └── infrastructure/
│       │   │   │
│       │   │   ├── storage/
│       │   │   │   ├── application/
│       │   │   │   │   ├── usecases/
│       │   │   │   │   ├── dtos/
│       │   │   │   │   └── index.ts
│       │   │   │   ├── domain/
│       │   │   │   └── infrastructure/
│       │   │   │
│       │   │   └── mcp/
│       │   │       ├── application/
│       │   │       │   ├── usecases/
│       │   │       │   ├── dtos/
│       │   │       │   └── index.ts
│       │   │       ├── domain/
│       │   │       └── infrastructure/
│       │   │           └── adapters/
│       │   │
│       │   └── infrastructure/
│       │       └── db/
│       │           ├── IDatabase.ts
│       │           ├── schema.ts
│       │           ├── index.ts
│       │           └── migrations/
│       │               └── 001_initial.sql
│       │
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       └── vitest.config.ts
│
└── nanpad-app/                      # @nanpad/app — Tauri + React + UI
    ├── src/
    │   ├── main.tsx                 # Punto de entrada React
    │   ├── App.tsx                  # Composition Root: abre DB, migraciones
    │   ├── App.css                  # Tailwind + paleta CSS (shadcn/ui slate oklch)
    │   ├── test-setup.ts
    │   ├── vite-env.d.ts
    │   ├── webview2-dnd-polyfill.ts # Polyfill DnD para WebView2 (Tauri/Windows)
    │   │
    │   ├── app/                     # Shell y rutas
    │   │   ├── AppContext.tsx       # Context con UseCases inyectados
    │   │   ├── composition.ts       # Composition Root (instancia repos + UseCases)
    │   │   ├── router.ts            # Tipos de rutas (AppRoute)
    │   │   ├── Shell.tsx            # Layout principal: sidebar + contenido
    │   │   └── useTheme.ts          # Hook para tema claro/oscuro
    │   │
    │   ├── infrastructure/
    │   │   ├── FsService.ts         # Capa sobre @tauri-apps/plugin-fs y plugin-dialog
    │   │   ├── SqliteAdapter.ts     # Implementa IDatabase con @tauri-apps/plugin-sql
    │   │   └── SqliteStorageAdapter.ts
    │   │
    │   ├── features/
    │   │   ├── tasks/               # Módulo de tareas (UI)
    │   │   │   ├── TasksPage.tsx    # Orquesta filtros, vistas y formulario
    │   │   │   └── components/
    │   │   │       ├── KanbanView.tsx      # Vista Kanban con DnD
    │   │   │       ├── TaskListView.tsx    # Vista lista virtualizada
    │   │   │       └── TaskForm.tsx        # Modal crear/editar tarea
    │   │   │
    │   │   ├── explorer/            # Explorador de archivos del SO
    │   │   │   ├── ExplorerPage.tsx # Integra FileTree + TabBar + EditorPanel
    │   │   │   ├── components/
    │   │   │   │   ├── FileTree.tsx   # Árbol lazy con menú contextual
    │   │   │   │   ├── TabBar.tsx     # Tabs de archivos abiertos
    │   │   │   │   └── EditorPanel.tsx # Monaco + preview MD/Mermaid
    │   │   │   └── utils/
    │   │   │       └── langDetect.ts  # Extensión → lenguaje Monaco
    │   │   │
    │   │   ├── documents/           # (Legado — DocumentsPage para MCP)
    │   │   │   ├── DocumentsPage.tsx
    │   │   │   └── components/
    │   │   │       ├── DocumentEditor.tsx
    │   │   │       └── MarkdownPreview.tsx  # Reutilizado por ExplorerPage
    │   │   │
    │   │   └── settings/
    │   │       └── SettingsPage.tsx
    │   │
    │   ├── store/
    │   │   ├── useCategoryStore.ts
    │   │   ├── useDocumentStore.ts
    │   │   ├── useExplorerStore.ts  # Estado del explorador: árbol, tabs, temporales
    │   │   └── useTaskStore.ts
    │   │
    │   └── ui/
    │       ├── components/
    │       │   ├── Badge.tsx        # Badges de estado y prioridad
    │       │   ├── ContextMenu.tsx  # Menú contextual flotante
    │       │   └── Spinner.tsx
    │       └── icons/
    │           └── index.tsx        # Iconos FontAwesome tipados
    │
    ├── src-tauri/
    │   ├── src/
    │   │   ├── lib.rs               # Registro de plugins Tauri
    │   │   └── main.rs
    │   ├── capabilities/
    │   │   └── default.json         # Permisos: fs, dialog, sql, opener
    │   ├── Cargo.toml               # tauri-plugin-fs, tauri-plugin-dialog, plugin-sql
    │   ├── Cargo.lock
    │   ├── build.rs
    │   └── tauri.conf.json
    │
    ├── public/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts               # Aliases: @, @ui, @features, @app, @nanpad/core
    └── tailwind.config.js
```

### Aliases de importación (vite.config.ts)

| Alias | Apunta a |
|-------|----------|
| `@` | `nanpad-app/src/` |
| `@ui` | `nanpad-app/src/ui/` |
| `@features` | `nanpad-app/src/features/` |
| `@app` | `nanpad-app/src/app/` |
| `@nanpad/core` | `packages/core/src/index.ts` |
| `@shared` | `packages/core/src/shared/` |
| `@modules` | `packages/core/src/modules/` |

> **Regla**: siempre usar los aliases anteriores en los imports. Nunca usar rutas relativas `../../` en `nanpad-app/src`.

### Reglas reflejadas en la estructura

- **Desacoplamiento total de Tauri en el core**: `@nanpad/core` no importa ningún paquete de `@tauri-apps/*`. La única pieza que conoce Tauri es `SqliteAdapter.ts` en `nanpad-app/src/infrastructure/`.
- **`IDatabase`** define el contrato de base de datos; `SqliteAdapter` lo implementa. Los repositorios del core solo conocen `IDatabase`.
- Cada módulo tiene `application/index.ts` como única API pública. No hay imports entre `domain` o `infrastructure` de distintos módulos.
- El **Composition Root** (`App.tsx` + `composition.ts`) instancia `SqliteAdapter`, ejecuta migraciones e inyecta repositorios y UseCases.
- **Vite en la app** apunta directamente al source de `@nanpad/core` (sin compilar `dist/` primero), por lo que `pnpm dev` desde la raíz lanza todo con un solo comando.
- **Explorador de archivos**: la UI del módulo `document` fue reemplazada por `features/explorer/` que usa `@tauri-apps/plugin-fs` y `plugin-dialog`. El módulo `document` de `@nanpad/core` se conserva para el MCP.

### Comandos principales

```bash
# Desarrollo (desde la raíz del monorepo)
pnpm dev                         # Lanza tauri dev (Vite transpila el core en tiempo real)

# Tests
pnpm test                        # Todos los workspaces en paralelo
pnpm test:core                   # Solo @nanpad/core
pnpm test:app                    # Solo @nanpad/app

# Build de producción
pnpm build                       # Compila core a dist/ y luego build de Tauri

# Typecheck
pnpm typecheck                   # Ambos paquetes
```

---

## 5. Tecnologías y framework para UI

| Área | Elección | Versión |
|------|----------|---------|
| **Gestor de paquetes / monorepo** | **pnpm workspaces** | pnpm 10 |
| **Plataforma** | **Tauri 2** | 2.x |
| **Lenguaje** | **TypeScript (strict)** | ~5.8 |
| **Build / Dev** | **Vite** | 7.x |
| **Framework UI** | **React** | 19.x |
| **Estado UI** | **Zustand** | 5.x |
| **Editor** | **Monaco Editor** (`@monaco-editor/react`) | 4.x |
| **Markdown + Mermaid** | **marked** + **mermaid** | 15.x / 11.x |
| **Estilos** | **Tailwind CSS** + variables CSS para tema | 3.x |
| **Virtualización** | **@tanstack/react-virtual** | 3.x |
| **Base de datos** | **@tauri-apps/plugin-sql** (SQLite) | 2.x |
| **Testing** | **Vitest** | 4.x |

Stack definitivo:

- **Monorepo**: pnpm workspaces: `@nanpad/core` (dominio puro) + `@nanpad/app` (Tauri + React)
- **Tauri 2 + Vite + TypeScript strict**
- **React 19 + Zustand 5**
- **Monaco Editor + marked + mermaid**
- **Tailwind CSS** con variables CSS para tema claro/oscuro
- **SQLite via `@tauri-apps/plugin-sql`**; interfaz `IDatabase` en el core para desacoplar de Tauri
---

## 6. Plan paso a paso para comenzar el proyecto con un agente de IA

El siguiente plan está pensado para que un agente de IA (o un desarrollador) pueda ejecutarlo en orden, con entregables claros.

### Fase 0: Preparación del entorno (pasos 1–3)

| Paso | Acción | Entregable | Comandos / Notas |
|------|--------|------------|-------------------|
| 0.1 | Crear proyecto Tauri + Vite + TypeScript | Repo con `src-tauri` y frontend Vite | `npm create tauri-app@latest` (elegir Vite + TS). |
| 0.2 | Configurar TypeScript estricto | `tsconfig.json` con `strict: true` | Revisar `strict`, `noImplicitAny`, `strictNullChecks`. |
| 0.3 | Añadir dependencias base | package.json actualizado | React (o Vue/Svelte), Zustand, Tailwind; Monaco, marked, mermaid. |

### Fase 1: Shared Kernel y persistencia (pasos 4–8)

| Paso | Acción | Entregable | Comandos / Notas |
|------|--------|------------|-------------------|
| 1.1 | Implementar Event Bus tipado inyectable | `shared/event-bus/` | Interface + implementación síncrona y async; sin estado global. |
| 1.2 | Definir tipos shared (ID, etc.) | `shared/types/` | UUID v4 para todas las entidades. |
| 1.3 | Crear esquema SQLite y migraciones | `infrastructure/db/migrations/001_initial.sql` | Copiar el SQL de la sección 2 de este documento. |
| 1.4 | Implementar cliente SQLite (better-sqlite3 o sql.js) | `infrastructure/db/` o en `storage/infrastructure` | Abrir/cerrar DB; ejecutar migraciones en orden. |
| 1.5 | Probar que la DB se crea y migra | Test o script | Ejecutar migraciones y comprobar tablas. |

### Fase 2: Módulo Task (pasos 9–14)

| Paso | Acción | Entregable | Comandos / Notas |
|------|--------|------------|-------------------|
| 2.1 | Crear estructura de carpetas del módulo Task | `modules/task/` con application, domain, infrastructure | Seguir sección 5 de la especificación. |
| 2.2 | Definir entidad Task y value objects | `domain/entities/`, `value-objects/` | Task, TaskStatus, Prioridad. |
| 2.3 | Definir TaskDTO y contratos de repositorio | `application/dtos/`, `domain` o infrastructure | TaskDTO; interface TaskRepository. |
| 2.4 | Implementar TaskSqliteRepository | `infrastructure/persistence/sqlite/` | CRUD sobre `tasks`, `task_categories`, `task_tags`, `subtasks`, `task_code_snippets`. |
| 2.5 | Implementar UseCases: Create, Update, List, MoveStatus, Complete, Restore | `application/usecases/` | Cada UseCase recibe repo + EventBus por inyección. |
| 2.6 | Implementar AddSubtask y AttachCodeToTask | Idem | Persistir en `subtasks` y `task_code_snippets`. |
| 2.7 | Exponer solo UseCases y DTOs en `application/index.ts` | `modules/task/application/index.ts` | Sin exportar domain ni infrastructure. |
| 2.8 | Escribir tests unitarios de UseCases y de repositorio | `modules/task/**/*.test.ts` | Vitest; datos en memoria o DB en disco temporal. |

### Fase 3: Módulo Category (pasos 15–18)

| Paso | Acción | Entregable | Comandos / Notas |
|------|--------|------------|-------------------|
| 3.1 | Estructura Category (application, domain, infrastructure) | `modules/category/` | Igual patrón que Task. |
| 3.2 | Entidades y DTOs; CategoryRepository (SQLite) | domain + infrastructure | CRUD categories; jerarquía (parent_id). |
| 3.3 | UseCases: Create, Update, Delete (seguro), List | application/usecases | Eliminación segura: reasignar o desasignar tareas. |
| 3.4 | Tests y export público en `application/index.ts` | index.ts + tests | Vitest. |

### Fase 4: Módulo History (pasos 19–21)

| Paso | Acción | Entregable | Comandos / Notas |
|------|--------|------------|-------------------|
| 4.1 | Estructura History; entidad/registro de cambio | `modules/history/` | HistoryEntry; tabla `history_entries`. |
| 4.2 | UseCase RecordChange y GetEntityHistory | application/usecases | Llamados desde otros módulos vía Event Bus o inyección directa del UseCase. |
| 4.3 | Integrar RecordChange en Task (y opcionalmente Category/Document) | Desde Task UseCases | Al crear/actualizar/completar, registrar en history. |

### Fase 5: Módulo Document (pasos 22–26)

| Paso | Acción | Entregable | Comandos / Notas |
|------|--------|------------|-------------------|
| 5.1 | Estructura Document; entidad Document | `modules/document/` | Decidir: contenido en DB o en archivos .md. |
| 5.2 | DocumentRepository (SQLite + opcionalmente FS) | infrastructure | Guardar/leer contenido. |
| 5.3 | UseCases: Create, Update, Get, List | application/usecases | DTOs con título e id; contenido en Get. |
| 5.4 | Integrar Monaco en la UI (solo lectura/edición de texto) | feature document-editor | Componente que usa Monaco; contenido desde UseCase. |
| 5.5 | Vista previa Markdown (marked + mermaid) | Idem | Panel de preview; debounce al escribir. |

### Fase 6: Módulo Storage (pasos 27–29)

| Paso | Acción | Entregable | Comandos / Notas |
|------|--------|------------|-------------------|
| 6.1 | Estructura Storage; UseCases Export/Import/Backup | `modules/storage/` | Serializar tablas a JSON; validar schema_version en import. |
| 6.2 | Export completo y por módulo | application/usecases | Incluir todas las tablas o subconjunto. |
| 6.3 | Import seguro + migraciones si versión distinta | Idem | Leer JSON; aplicar migraciones si es necesario; insertar datos. |

### Fase 7: Módulo MCP (pasos 30–32)

| Paso | Acción | Entregable | Comandos / Notas |
|------|--------|------------|-------------------|
| 7.1 | Estructura MCP; UseCases que delegan en Task/Document/Category | `modules/mcp/` | MCP: CreateTask → Task.CreateTask; etc. |
| 7.2 | Definir API (comandos o herramientas) que expone el agente | infrastructure/adapters | Lista de “tools” o comandos con nombres y parámetros. |
| 7.3 | Conectar con servidor MCP (si la app actúa como servidor MCP) | Idem | Según estándar MCP; cada tool llama al UseCase correspondiente. |

### Fase 8: Composition Root y shell de la app (pasos 33–35)

| Paso | Acción | Entregable | Comandos / Notas |
|------|--------|------------|-------------------|
| 8.1 | Crear Composition Root en `main.ts` (o `composition.ts`) | Instanciar EventBus, repositorios, todos los UseCases | Inyectar en app o en un contexto de DI ligero. |
| 8.2 | Shell de la app: layout (sidebar opcional, rutas) | `app/App.tsx`, rutas | Rutas: /tasks (kanban/lista), /documents, /settings. |
| 8.3 | Tema claro/oscuro y modo High Performance (persistido) | UI + Storage o settings en SQLite | Variables CSS; preferencia guardada. |

### Fase 9: Features de UI (pasos 36–42)

| Paso | Acción | Entregable | Comandos / Notas |
|------|--------|------------|-------------------|
| 9.1 | Vista lista de tareas (con filtros y ordenación) | features/task-list | Llamar ListTasks; virtualización si hay muchas. |
| 9.2 | Vista Kanban (columnas por status; drag & drop) | features/kanban | Actualizar MoveTaskStatus al soltar. |
| 9.3 | Formulario crear/editar tarea (con categorías y etiquetas) | Idem o componente compartido | CreateTask / UpdateTask. |
| 9.4 | Adjuntar código desde editor a tarea | feature document-editor + task | Selección en Monaco → modal “Añadir a tarea” → AttachCodeToTask. |
| 9.5 | Vista documento: editor + preview en split | features/document-editor | Monaco + marked + mermaid. |
| 9.6 | Pantalla de import/export y backup | features/settings o dedicada | Llamar Storage UseCases. |
| 9.7 | Ajustes: tema, modo High Performance | features/settings | Guardar en Storage o tabla `settings`. |

### Fase 10: Refinamiento y cierre (pasos 43–46)

| Paso | Acción | Entregable | Comandos / Notas |
|------|--------|------------|-------------------|
| 10.1 | Undo/Redo en editor de documento (opcional) | history + document-editor | Historial de contenido; aplicar en UI. |
| 10.2 | Tests de integración E2E (opcional) | Playwright o similar | Flujo: crear tarea, abrir documento, export. |
| 10.3 | Revisar reglas de oro: sin singletons, sin imports entre módulos internos | Code review | Checklist de la sección 4 de la especificación. |
| 10.4 | Documentar en README: cómo ejecutar, estructura, y referencia a este plan | README.md | Comandos `npm run dev`, `npm run build`, estructura de carpetas. |

---
