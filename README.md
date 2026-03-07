# NANPAD

**Aplicación local de gestión de tareas y documentación técnica.**  
100 % local, sin backend en la nube. Pensada como gestor de tareas tipo Kanban + editor técnico con documentación viva y workspace para desarrolladores.

---

## De qué va el proyecto

NANPAD combina en una sola app de escritorio:

- **Gestión de tareas** con categorías propias, prioridades, etiquetas y vistas Kanban y lista.
- **Documentación técnica** con editor Markdown (Monaco), vista previa en tiempo real, diagramas Mermaid y soporte para código e imágenes.
- **Persistencia local** en SQLite y archivos; export/import y backups.
- **Historial de cambios** y versionado ligero por entidad.

Todo corre en tu máquina: no hay sincronización en la nube ni dependencia de servicios externos.

---

## Características principales

| Área | Funcionalidad |
|------|----------------|
| **Tareas** | Crear, editar, categorizar, prioridades, etiquetas, estados (To Do / In Progress / Done), subtareas, filtros dinámicos. |
| **Vistas** | Kanban (arrastrar y soltar), lista ordenable, historial de cambios por tarea. |
| **Categorías** | Crear categorías con nombre y color; jerarquía opcional; asignación múltiple a tareas. |
| **Documentos** | Editor con Monaco, vista previa Markdown en tiempo real, Mermaid, resaltado de código, split view redimensionable. |
| **Explorador** | Árbol de archivos/notas, pestañas, búsqueda, detección de idioma (Markdown, TypeScript, JSON, etc.). |
| **Almacenamiento** | SQLite local, export/import JSON, backup manual. |
| **UI** | Tema claro/oscuro, sidebar de navegación, diseño responsive. |
| **Productividad** | Paleta de comandos (Ctrl+K), ayuda flotante, persistencia de sesión (pestañas del explorador, preferencias y vista por defecto de tareas en SQLite), undo/redo de tareas (últimas acciones). |
| **Tareas avanzadas** | Adjuntar fragmentos de código a tareas, historial de cambios por tarea, vinculación explorador ↔ tarea. |

La especificación completa y el plan por fases están en la carpeta **`.resources/`** (plan maestro, especificación técnica), cuando exista en el repo.

---

## Detalles técnicos

- **Plataforma:** Tauri 2 (app de escritorio; frontend en TypeScript).
- **Frontend:** React 19, Zustand, Tailwind CSS, Monaco Editor, marked, Mermaid.
- **Arquitectura:** Module-First; cada módulo expone UseCases y DTOs; Event Bus inyectado; Composition Root manual.
- **Persistencia:** SQLite vía `@tauri-apps/plugin-sql`; migraciones versionadas.
- **Monorepo:** paquete `@nanpad/core` (lógica de dominio, UseCases y repositorios SQLite para task, category, document, history, storage, MCP) y `@nanpad/app` (UI Tauri + Vite).
- **MCP:** servidor MCP en `@nanpad/core` para que agentes de IA interactúen con tareas, categorías, subtareas y adjuntos de código. En **Ajustes → Integración MCP** puedes activar un servidor HTTP local (solo 127.0.0.1). Para usarlo en **Cursor** o **VS Code** se incluye el adaptador stdio en `mcp-adapter/`; la misma pantalla de Ajustes explica cómo configurar el `mcp.json` en cada editor. Ver `packages/core/src/modules/mcp/README.md`.
- **Tests:** Vitest en core y app; tests unitarios e integración por módulo en `@nanpad/core`.

---

## Requisitos previos

- **Node.js** 18+ (recomendado LTS).
- **pnpm** 8+ (`npm install -g pnpm`).
- **Rust** (solo para ejecutar o empaquetar la app Tauri): [rustup](https://rustup.rs/).  
  En Windows, además, hace falta [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) con “Desktop development with C++”.

Para usar solo la parte web en el navegador (sin ventana Tauri), no hace falta Rust.

---

## Instalación y ejecución

### 1. Clonar e instalar dependencias

Desde la raíz del repositorio:

```bash
cd NANPAD
pnpm install
```

Esto instala dependencias de todo el monorepo (`packages/core` y `nanpad-app`).

### 2. Ejecutar la aplicación

**Opción A – App de escritorio (Tauri)**

```bash
pnpm dev
```

Abre la ventana de la aplicación y arranca el servidor de desarrollo de Vite. Requiere Rust instalado.

**Opción B – Solo frontend en el navegador (sin Tauri)**

```bash
cd nanpad-app
pnpm dev
```

Abre en el navegador la URL que indique Vite (por ejemplo `http://localhost:1420`). No requiere Rust. Parte de la funcionalidad que depende de Tauri (p. ej. SQLite o sistema de archivos) puede no estar disponible.

### 3. Otros comandos desde la raíz

| Comando | Descripción |
|---------|-------------|
| `pnpm build` | Build de core y app (incluye Tauri si corresponde). |
| `pnpm test` | Ejecuta tests de todos los paquetes. |
| `pnpm test:core` | Solo tests del paquete `@nanpad/core`. |
| `pnpm test:app` | Solo tests de `@nanpad/app`. |
| `pnpm typecheck` | Verificación de tipos en todo el monorepo. |
| `pnpm lint` | Linter en todos los paquetes. |
| `pnpm build:portable` | Build de core + app y ejecutable portable (sin instalador). |

### 4. Comandos dentro de `nanpad-app`

```bash
cd nanpad-app
pnpm dev          # Servidor Vite (solo web)
pnpm tauri dev     # App Tauri + Vite
pnpm build        # Build frontend (tsc + vite build)
pnpm tauri build  # Empaquetado instalable de la app
pnpm test         # Tests Vitest
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint
```

### 5. Generar el instalador

Para empaquetar la aplicación y obtener el instalador (.msi/.exe en Windows, .dmg/.app en macOS, etc.):

1. **Requisitos:** Node, pnpm, Rust (y en Windows, Visual Studio Build Tools con C++). Igual que para `pnpm dev` con Tauri.
2. **Desde la raíz del repo:**

   ```bash
   pnpm build
   cd nanpad-app
   pnpm tauri build
   ```

   O todo desde la raíz en un solo paso (el `build` del monorepo ya compila core y frontend):

   ```bash
   pnpm build
   pnpm --filter @nanpad/app tauri build
   ```

3. **Salida:** Los instaladores y ejecutables quedan en `nanpad-app/src-tauri/target/release/bundle/`:
   - **Windows:** `.msi` (instalador) y `.exe` (portable).
   - **macOS:** `.dmg` y `.app`.
   - **Linux:** `.deb`, `.AppImage`, etc., según el target.

La primera vez que ejecutes `tauri build` puede tardar más porque compila Rust y dependencias.

---

## Base de datos al iniciar

- **Creación:** Sí. Si la base de datos no existe, se crea al iniciar la app. El adaptador usa la ruta por defecto `sqlite:nanpad.db` (en el directorio de datos de la aplicación, gestionado por Tauri).
- **Migraciones:** Al arrancar, se ejecuta `runMigrations(db)` desde el Composition Root (`App.tsx`): se crea la tabla `schema_version` y se aplican las migraciones definidas en `@nanpad/core` (001 a 009: esquema inicial, índices, tablas auxiliares, etc.). Es seguro en la primera ejecución.
- **Seed:** En el proyecto **no hay seed** que rellene datos iniciales (categorías por defecto, tareas de ejemplo, etc.). La base queda vacía tras las migraciones. Si querés datos básicos al primer arranque, se puede añadir un paso opcional “seed” que se ejecute una sola vez (por ejemplo, si `schema_version` está recién creado o si no hay categorías).

### Dónde se guardan la DB y los temporales (modo desarrollo)

En desarrollo (`pnpm dev` con Tauri), todo se escribe en carpetas de datos de la aplicación. El **identifier** del proyecto es `com.nanpad-app` (en `nanpad-app/src-tauri/tauri.conf.json`).

| Qué | Dónde (en desarrollo) |
|-----|------------------------|
| **Base de datos** (`sqlite:nanpad.db`) | El plugin usa **BaseDirectory::AppConfig**. En **Windows**: `C:\Users\<usuario>\AppData\Roaming\com.nanpad-app\nanpad.db`. En **macOS**: `~/Library/Application Support/com.nanpad-app/nanpad.db`. En **Linux**: `~/.config/com.nanpad-app/nanpad.db`. No se crea dentro del proyecto ni en `target/debug`. |
| **Notas temporales** (explorador) | **AppLocalData** + `nanpad/temp`. En **Windows**: `C:\Users\<usuario>\AppData\Local\com.nanpad-app\nanpad\temp\`. En **macOS**: `~/Library/Application Support/com.nanpad-app/nanpad/temp/`. En **Linux**: `~/.local/share/com.nanpad-app/nanpad/temp/`. |

Para ver la ruta real en runtime: en la consola de DevTools ejecutá `(await import('@tauri-apps/api/path')).appLocalDataDir()`.

---

## Estructura del repositorio

```
NANPAD/
├── README.md                 # Este archivo
├── package.json              # Monorepo (pnpm workspaces)
├── AGENTS.md                 # Instrucciones para el agente de IA
├── mcp-adapter/              # Adaptador stdio MCP para Cursor/VS Code (node mcp-adapter/index.mjs)
├── .resources/               # Plan maestro y especificación técnica (si existe)
├── packages/
│   └── core/                 # @nanpad/core
│       ├── src/
│       │   ├── shared/       # Event Bus, tipos (id, Result)
│       │   ├── infrastructure/  # DB (IDatabase, schema, migraciones)
│       │   └── modules/      # task, category, document, history, storage, mcp
│       └── package.json
└── nanpad-app/               # @nanpad/app: UI Tauri + React + Vite
    ├── src/
    │   ├── app/              # Shell, router, Composition Root, tema
    │   ├── features/         # home, tasks, explorer, documents, settings, command-palette, help
    │   ├── store/            # Zustand (tareas, categorías, explorador, etc.)
    │   ├── ui/               # Componentes reutilizables
    │   └── infrastructure/   # SqliteAdapter, FsService, persistencia sesión/preferencias
    └── src-tauri/            # Tauri (Rust): ventana, plugins (SQL, FS, dialog, etc.)
```

Para más detalle sobre la estructura de la app, el estado por fases y la arquitectura Module-First, ver **`nanpad-app/README.md`**. La especificación y el plan maestro se referencian en `.cursor/rules/` y, si existe, en `.resources/`.
