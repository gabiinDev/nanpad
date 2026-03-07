# NANPAD — App

**Aplicación local de gestión de tareas + documentación técnica**  
Arquitectura Module-First · Tauri 2 · React 19 · TypeScript strict · SQLite

---

## Stack

| Área | Tecnología |
|------|------------|
| Plataforma | Tauri 2 (desktop local, Rust mínimo) |
| Lenguaje | TypeScript strict |
| UI | React 19 + Zustand |
| Estilos | Tailwind CSS 3 |
| Editor | Monaco Editor |
| Markdown | marked + mermaid |
| Virtualización | @tanstack/react-virtual |
| Persistencia | SQLite vía @tauri-apps/plugin-sql |
| Tests | Vitest 4 |

---

## Cómo ejecutar

Desde la **raíz del monorepo** (recomendado):

```bash
pnpm install
pnpm dev          # Abre la ventana Tauri + Vite
pnpm test         # Tests de todos los paquetes
pnpm test:app     # Solo tests de esta app
pnpm typecheck    # Verificación de tipos
pnpm lint         # ESLint
```

Desde **dentro de `nanpad-app`**:

```bash
pnpm install      # o npm install (workspace ya instalado desde raíz)
pnpm dev          # Solo frontend en navegador (Vite)
pnpm tauri dev    # App Tauri + Vite
pnpm build        # tsc + vite build
pnpm tauri build  # Instalador / ejecutable
pnpm test         # Vitest
pnpm test:watch   # Vitest en modo watch
pnpm test:ui      # Vitest con UI
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint
```

---

## Estructura del proyecto (nanpad-app)

La lógica de dominio (módulos task, category, document, history, storage, mcp) y el Event Bus viven en **`@nanpad/core`** (`packages/core`). Esta app solo contiene la capa de presentación y la infraestructura de conexión a Tauri.

```
nanpad-app/
├── src/
│   ├── main.tsx               # Punto de entrada React
│   ├── App.tsx                # Raíz: abre DB, migraciones, Composition Root, Shell
│   ├── App.css                # Tailwind + variables de tema (claro/oscuro)
│   │
│   ├── app/                   # Shell y orquestación
│   │   ├── Shell.tsx          # Layout (sidebar, rutas, paleta de comandos, toasts)
│   │   ├── router.ts          # Rutas: home | tasks | documents | settings
│   │   ├── composition.ts     # Composition Root (EventBus, repos, UseCases)
│   │   ├── AppContext.tsx     # Provider de UseCases
│   │   └── useTheme.ts        # Tema claro/oscuro
│   │
│   ├── features/              # Pantallas y flujos por dominio
│   │   ├── home/              # HomePage (resumen)
│   │   ├── tasks/             # TasksPage: Kanban, lista, formulario, historial, categorías
│   │   ├── explorer/          # ExplorerPage: árbol de archivos, pestañas, editor, búsqueda
│   │   ├── documents/         # DocumentEditor, MarkdownPreview (split view)
│   │   ├── settings/          # Ajustes: tema, categorías, export/import/backup
│   │   ├── command-palette/   # Paleta de comandos (Ctrl+K)
│   │   └── help/              # HelpFloating (ayuda contextual)
│   │
│   ├── store/                 # Estado global (Zustand)
│   │   ├── useTaskStore.ts
│   │   ├── useCategoryStore.ts
│   │   ├── useDocumentStore.ts
│   │   ├── useExplorerStore.ts
│   │   ├── useRouteStore.ts
│   │   ├── useAppSettingsStore.ts
│   │   ├── useCommandPaletteStore.ts
│   │   ├── useToastStore.ts
│   │   └── ...
│   │
│   ├── ui/                    # Componentes reutilizables
│   │   ├── components/        # Badge, Spinner, Toast, ContextMenu, etc.
│   │   └── icons/
│   │
│   └── infrastructure/        # Adaptadores y persistencia local
│       ├── SqliteAdapter.ts   # Apertura de SQLite (Tauri)
│       ├── SqliteStorageAdapter.ts  # Puerto de almacenamiento para Storage UseCases
│       ├── FsService.ts       # Lectura/escritura de archivos (explorador)
│       ├── appSettingsPersistence.ts
│       ├── explorerSessionPersistence.ts
│       └── taskUndoPersistence.ts
│
└── src-tauri/                 # Tauri (Rust): ventana, plugins SQL, FS, dialog, opener
```

---

## Arquitectura

- **Module-First**: los módulos de dominio están en `@nanpad/core`; cada uno expone UseCases y DTOs desde su `application/index.ts`.
- **Composition Root** en `app/composition.ts`: se instancian Event Bus, repositorios y UseCases una sola vez al abrir la DB.
- **Sin singletons globales**: todo se inyecta vía `AppContext` (UseCases) y stores Zustand (estado UI).
- **DTOs** como único contrato entre core y app.
- **TypeScript strict** en todo el monorepo.

Para el plan de fases y la especificación técnica, ver la carpeta **`.resources/`** (si existe) o las reglas en **`.cursor/rules/`**.

---

## Estado de implementación

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Entorno: Tauri + Vite + TS + dependencias | ✅ |
| 1 | Shared Kernel + SQLite + Event Bus | ✅ |
| 2 | Módulo Task (CRUD, subtareas, código adjunto, historial) | ✅ |
| 3 | Módulo Category | ✅ |
| 4 | Módulo History (RecordChange, GetEntityHistory) | ✅ |
| 5 | Módulo Document | ✅ |
| 6 | Módulo Storage (Export, Import, Backup) | ✅ |
| 7 | Módulo MCP (McpServer, registro de herramientas) | ✅ |
| 8 | Composition Root + Shell UI (rutas, tema, paleta, toasts) | ✅ |
| 9 | Features UI (Kanban, lista, explorador, editor, ajustes) | ✅ |
| 10 | Refinamiento (persistencia sesión, preferencias, undo tareas) | ✅ |

Funcionalidades actuales: tareas con categorías, prioridades, etiquetas, subtareas y fragmentos de código; vistas Kanban y lista; explorador de archivos con pestañas y editor; documentos Markdown con vista previa y Mermaid; export/import/backup desde Ajustes; paleta de comandos (Ctrl+K); tema claro/oscuro; historial por tarea; persistencia de pestañas y preferencias en SQLite.
