# Instrucciones para el agente de IA — NANPAD

Este proyecto tiene reglas e instrucciones específicas para que el agente trabaje de forma consistente y segura.

## Dónde están las reglas

- **Reglas detalladas**: carpeta **`.cursor/rules/`** (archivos `.mdc`). Cursor las aplica automáticamente según su configuración.
  - `nanpad-golden-rules.mdc` — reglas de oro (versiones, documentación, preguntar al usuario).
  - `nanpad-project-conventions.mdc` — especificación, arquitectura y plan.
  - `nanpad-code-practices.mdc` — buenas prácticas de código (tipos, SOLID, JSDoc, linter, tamaño de archivos, formato).
  - `nanpad-testing.mdc` — testing: convenciones de nombres, mocks, tests por capa y **tests de performance en puntos fuertes** (parsing, indexación, listas grandes, export/import, historial).
  - `nanpad-import-aliases.mdc` — **imports con alias de path**: nunca usar `../` cuando existe alias; tabla de alias por paquete con ejemplos.
- **Especificación y plan**: carpeta **`.resources/`**:
  - `PLAN-MAESTRO-NANPAD.md` — funcionalidades, SQLite, UseCases, estructura, stack y **plan paso a paso por fases**.
  - `especificacion-tecnica-nanpad-1.md` y `especificacion-tecnica-nanpad-2.md` — especificación técnica oficial.

Consulta siempre estos documentos antes de implementar o decidir algo que afecte la arquitectura o el alcance.

## Reglas de oro (resumen)

1. **Versiones**: Usar siempre la **última versión estable** de las librerías. Si no puedes determinarla, **solicitar la versión al usuario** en lugar de inventar una.
2. **Documentación**: **Consultar la documentación oficial** antes de suponer o inventar una solución; en especial ante **errores complejos**.
3. **Dudas**: Si no sabes cómo seguir, tienes incertidumbre o la decisión afecta al proyecto, **preguntar al usuario** antes de avanzar; no continuar a ciegas.

El detalle de estas reglas está en `.cursor/rules/nanpad-golden-rules.mdc`.

## Cómo trabajar en el proyecto

- Seguir el **plan por fases** descrito en `.resources/PLAN-MAESTRO-NANPAD.md`.
- Respetar la **arquitectura Module-First** y las reglas de la especificación (solo `application/index.ts` público, Event Bus inyectado, sin singletons, DTOs entre módulos).
- Ante conflictos entre lo que pide el usuario y lo que dice la especificación, **preguntar al usuario** cómo proceder.
