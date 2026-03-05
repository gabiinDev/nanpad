# NANPAD

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
| Persistencia | SQLite via @tauri-apps/plugin-sql |
| Tests | Vitest 4 |

---

## Cómo ejecutar

```bash
# Instalar dependencias
npm install

# Desarrollo (abre la ventana de Tauri)
npm run tauri dev

# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Verificar tipos
npm run typecheck

# Build de producción
npm run tauri build
```

---

## Estructura del proyecto

```
nanpad/
├── src/
│   ├── main.tsx               # Punto de entrada React
│   ├── App.tsx                # Componente raíz + inicialización DB
│   ├── App.css                # Tailwind + variables de tema (claro/oscuro)
│   │
│   ├── shared/                # Shared Kernel (mínimo)
│   │   ├── event-bus/         # Event Bus tipado e inyectable
│   │   └── types/             # UUID, Result, tipos base
│   │
│   ├── modules/               # Módulos de dominio (Module-First)
│   │   ├── task/              # Gestión de tareas
│   │   ├── category/          # Categorías
│   │   ├── document/          # Documentos Markdown
│   │   ├── history/           # Historial de cambios
│   │   ├── storage/           # Export/Import/Backup
│   │   └── mcp/               # Integración MCP (agentes IA)
│   │
│   ├── ui/                    # Componentes presentacionales reutilizables
│   ├── features/              # Composables por pantalla
│   ├── app/                   # Shell (rutas, providers)
│   └── infrastructure/        # DB (SQLite), FS
│       ├── db/
│       │   ├── migrations/    # SQL de migraciones
│       │   ├── schema.ts      # Tipos de filas SQLite
│       │   └── index.ts       # Cliente DB + migraciones
│       └── fs/
│
└── src-tauri/                 # Tauri/Rust (mínimo: solo plugins)
```

---

## Arquitectura

- **Module-First**: cada módulo es una mini-aplicación interna con su propio `application/index.ts` público.
- **Sin singletons globales**: Event Bus, repositorios y UseCases se instancian en el Composition Root.
- **DTOs** como único contrato entre módulos.
- **TypeScript strict**: `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`.

Consulta `.resources/PLAN-MAESTRO-NANPAD.md` para el plan completo de fases.

---

## Estado de implementación

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Entorno: Tauri + Vite + TS + dependencias | ✅ |
| 1 | Shared Kernel + SQLite + Event Bus | ✅ |
| 2 | Módulo Task | 🔜 |
| 3 | Módulo Category | 🔜 |
| 4 | Módulo History | 🔜 |
| 5 | Módulo Document | 🔜 |
| 6 | Módulo Storage | 🔜 |
| 7 | Módulo MCP | 🔜 |
| 8 | Composition Root + Shell UI | 🔜 |
| 9 | Features UI (Kanban, Lista, Editor) | 🔜 |
| 10 | Refinamiento y cierre | 🔜 |
