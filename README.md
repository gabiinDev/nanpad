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

La especificación completa y el plan por fases están en la carpeta **`.resources/`** (plan maestro, especificación técnica).

---

## Detalles técnicos

- **Plataforma:** Tauri 2 (app de escritorio; frontend en TypeScript).
- **Frontend:** React 19, Zustand, Tailwind CSS, Monaco Editor, marked, Mermaid.
- **Arquitectura:** Module-First; cada módulo expone UseCases y DTOs; Event Bus inyectado; Composition Root manual.
- **Persistencia:** SQLite vía `@tauri-apps/plugin-sql`; migraciones versionadas.
- **Monorepo:** paquete `@nanpad/core` (lógica de dominio/application) y `@nanpad/app` (UI Tauri + Vite).

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
- **Migraciones:** Al arrancar, se ejecuta `runMigrations(db)` desde el Composition Root (`App.tsx`): se crea la tabla `schema_version` y se aplican las migraciones pendientes (p. ej. la 001 con el esquema inicial). Todo con `CREATE TABLE IF NOT EXISTS`, así que es seguro en la primera ejecución.
- **Seed:** En el proyecto **no hay seed** que rellene datos iniciales (categorías por defecto, tareas de ejemplo, etc.). La base queda vacía tras las migraciones. Si querés datos básicos al primer arranque, se puede añadir un paso opcional “seed” que se ejecute una sola vez (por ejemplo, si `schema_version` está recién creado o si no hay categorías).

---

## Estructura del repositorio

```
NANPAD/
├── README.md                 # Este archivo
├── package.json              # Monorepo (pnpm workspaces)
├── .resources/                # Plan maestro y especificación técnica
├── packages/
│   └── core/                 # @nanpad/core: dominio, UseCases, DTOs
└── nanpad-app/               # @nanpad/app: UI Tauri + React + Vite
    ├── src/
    │   ├── app/              # Shell, rutas, navegación
    │   ├── features/         # Explorer, tareas, documentos
    │   ├── ui/               # Componentes reutilizables
    │   └── ...
    └── src-tauri/            # Tauri (Rust): ventana, plugins (SQL, FS, etc.)
```

Para más detalle sobre la estructura de la app y la arquitectura Module-First, ver `nanpad-app/README.md` y `.resources/PLAN-MAESTRO-NANPAD.md`.
