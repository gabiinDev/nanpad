# ESPECIFICACIÓN TÉCNICA OFICIAL

## Aplicación Local de Gestión de Tareas + Documentación Técnica

### Arquitectura Module-First -- Monolito Modular de Alto Rendimiento

**Versión:** 3.0\
**Fecha:** 2026-03-01 20:52:15 UTC

------------------------------------------------------------------------

# 1. VISIÓN GENERAL DEL PRODUCTO

La aplicación es una herramienta **100% local**, open-source, pensada
como una combinación conceptual entre:

-   Gestor de tareas estilo kanban
-   Editor técnico estilo documentación viva
-   Workspace estructurado para desarrolladores

Debe permitir:

-   Crear tareas
-   Categorizar tareas de forma custom
-   Marcar tareas como completadas
-   Mantener historial de cambios
-   Previsualizar Markdown
-   Soporte Mermaid
-   Previsualización automática por extensión (imágenes, código, etc.)
-   Editor con Monaco
-   Importar / Exportar contenido y settings
-   Integración nativa con MCP para interacción con agentes de IA

No tendrá sincronización en la nube. No depende de backend. Toda la
persistencia es local.

------------------------------------------------------------------------

# 2. STACK TECNOLÓGICO DEFINIDO

## Lenguaje Dominante

-   TypeScript (estricto obligatorio)

## Plataforma Desktop

-   Tauri (mínimo Rust necesario)
-   Frontend completamente en TypeScript

## Renderizado y UI

-   Framework ligero basado en TypeScript
-   Arquitectura desacoplada
-   Monaco Editor
-   Markdown renderer con soporte Mermaid

## Persistencia

-   Archivos locales (JSON / Markdown estructurado)
-   Posible uso de SQLite local (si es necesario)
-   Exportación/Importación en JSON comprimido

## Rust (Uso Estrictamente Controlado)

Rust será utilizado únicamente si:

-   Existe un cuello de botella medido
-   La mejora es significativa
-   Se justifica la complejidad

Posibles casos: - Indexación masiva de archivos - Procesamiento pesado
de markdown - Parsing intensivo - Compresión optimizada - Operaciones de
búsqueda complejas

Rust nunca contendrá lógica de negocio. Solo optimización computacional.

------------------------------------------------------------------------

# 3. ARQUITECTURA PRINCIPAL

## Estilo Arquitectónico

-   Monolito Modular
-   Enfoque Module-First
-   Sin puertos/adaptadores pesados
-   Sin arquitectura hexagonal clásica
-   Límites estrictos por módulo
-   Comunicación explícita

Cada módulo es una mini-aplicación interna.

------------------------------------------------------------------------

# 4. REGLAS DE ORO (NO NEGOCIABLES)

1.  Los módulos exponen únicamente UseCases públicos.
2.  No se importan servicios internos de otro módulo.
3.  Event Bus siempre inyectado.
4.  Nunca usar singletons globales.
5.  No dependencias circulares.
6.  DTOs como único contrato entre módulos.
7.  Shared Kernel mínimo.
8.  Performance no justifica romper límites.
9.  Todo módulo debe poder aislarse.
10. El Composition Root es manual.

------------------------------------------------------------------------

# 5. ESTRUCTURA DE MÓDULO ESTÁNDAR

    modulo-x/
     ├── application/
     │    ├── usecases/
     │    ├── dtos/
     │    └── index.ts
     │
     ├── domain/
     │    ├── entities/
     │    ├── value-objects/
     │    ├── services/
     │
     ├── infrastructure/
     │    ├── persistence/
     │    ├── adapters/

Solo application/index.ts es público.

------------------------------------------------------------------------

# 6. MÓDULOS FUNCIONALES DE LA APP

## 6.1 Task Module

Responsable de:

-   Crear tarea
-   Editar tarea
-   Categorizar
-   Cambiar estado
-   Marcar completada
-   Restaurar tarea
-   Historial de cambios
-   Eventos de cambio

Debe soportar:

-   Subtareas
-   Prioridades
-   Etiquetas custom
-   Filtros dinámicos

------------------------------------------------------------------------

## 6.2 Category Module

-   Crear categorías custom
-   Jerarquías opcionales
-   Asignación múltiple
-   Eliminación segura
-   Eventos de reindexación

------------------------------------------------------------------------

## 6.3 Document Module

-   Editor Markdown
-   Soporte Mermaid
-   Vista previa en tiempo real
-   Detección por extensión
-   Renderizado de imágenes
-   Preview de código
-   Integración con Monaco

------------------------------------------------------------------------

## 6.4 History Module

-   Registro de cambios
-   Versionado liviano
-   Undo / Redo
-   Registro por entidad

------------------------------------------------------------------------

## 6.5 Storage Module

-   Persistencia local
-   Serialización
-   Importación
-   Exportación
-   Backup manual

------------------------------------------------------------------------

## 6.6 MCP Integration Module

Permite a agentes de IA:

-   Crear tareas
-   Completar tareas
-   Consultar estado
-   Generar documentos
-   Categorizar automáticamente

Debe exponer una API controlada. Nunca acceso directo al dominio.

------------------------------------------------------------------------

# 7. EVENT BUS

Debe:

-   Ser inyectado
-   Soportar síncrono
-   Soportar async fire-and-forget
-   Ser tipado
-   No tener estado global

Usar síncrono cuando: - Se requiera consistencia inmediata

Usar async cuando: - Sea side-effect no crítico

------------------------------------------------------------------------

# 8. PERFORMANCE

Optimización prioritaria en:

-   Render incremental
-   Virtualización de listas grandes
-   Lazy loading de módulos
-   Debounce de eventos
-   Workers para procesos pesados

Web Workers para:

-   Parsing
-   Indexación
-   Búsquedas grandes

Rust (WASM) solo en puntos medidos.

------------------------------------------------------------------------

# 9. DISEÑO Y UX

Debe incluir:

-   UI limpia y minimalista
-   Modo oscuro/claro
-   Panel lateral opcional
-   Vista kanban
-   Vista lista
-   Vista documento expandida
-   Split view (editor + preview)
-   Animaciones suaves pero desactivables

Modo High Performance: - Desactiva animaciones - Reduce efectos -
Prioriza velocidad

------------------------------------------------------------------------

# 10. IMPORT / EXPORT

-   Export completo del workspace
-   Export por módulo
-   Import seguro
-   Validación de versión
-   Backup incremental

------------------------------------------------------------------------

# 11. TESTING

-   Unit tests por módulo
-   Tests de integración por UseCase
-   Tests de eventos
-   Tests de performance medidos

------------------------------------------------------------------------

# 12. ESCALABILIDAD FUTURA

La arquitectura permite:

-   Extraer módulo como servicio
-   Migrar persistencia
-   Añadir sincronización futura
-   Integrar plugins externos
-   Soporte multi-workspace

------------------------------------------------------------------------

# 13. FILOSOFÍA FINAL

-   Modularidad estricta
-   Alto rendimiento
-   Sin sobre-ingeniería
-   TS como lenguaje principal
-   Rust solo cuando realmente importe
-   Límites fuertes
-   Evolución disciplinada

La aplicación prioriza claridad, control y performance real.
