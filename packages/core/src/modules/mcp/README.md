# Módulo MCP (Model Context Protocol)

Este módulo expone la lógica de NANPAD a agentes de IA mediante un **servidor MCP** que recibe requests y ejecuta UseCases (tareas, categorías, subtareas, adjuntos de código).

## Tools expuestas

| Tool | Descripción |
|------|-------------|
| `create_task` | Crear tarea (título, descripción, prioridad, categorías). |
| `complete_task` | Marcar tarea como completada. |
| `list_tasks` | Listar tareas con filtros (estado, categoría, texto). |
| `move_task_status` | Cambiar estado (todo / in_progress / done / archived). |
| `update_task` | Actualizar título, descripción, prioridad, categorías. |
| `restore_task` | Restaurar tarea completada/archivada a "todo". |
| `add_subtask` | Añadir subtarea a una tarea. |
| `update_subtask` | Actualizar subtarea (título, completado). |
| `delete_subtask` | Eliminar subtarea. |
| `attach_code_to_task` | Adjuntar fragmento de código/nota a una tarea (con lenguaje opcional: typescript, markdown, json, etc.). |
| `list_code_snippets_for_task` | Listar adjuntos de código de una tarea. |
| `delete_code_snippet` | Eliminar un fragmento adjunto. |
| `list_categories` | Listar categorías (opcionalmente con hijos). |
| `create_category` | Crear categoría (nombre, padre, color, icono). |
| `update_category` | Actualizar categoría. |
| `delete_category` | Eliminar categoría (unassign o reassign tareas). |

No se exponen documentos internos en DB (no utilizados en la app).

## Cómo funciona en la app

- **Ajustes → Integración MCP:** El usuario puede activar/desactivar el servidor MCP y elegir el puerto (por defecto 4242). El servidor HTTP escucha solo en **127.0.0.1** (localhost); no bloquea la app.
- Cuando está activo, la app (Tauri) abre un socket en ese puerto. Cada **POST** con cuerpo `{ "tool": "nombre", "params": { ... } }` recibe una respuesta JSON `{ "success": true, "data": ... }` o `{ "success": false, "error": "..." }`.

## Uso en Cursor o VS Code (adaptador stdio)

Cursor y VS Code esperan servidores MCP por **stdio** (protocolo JSON-RPC), no por HTTP. Para usarlos con NANPAD hace falta el **adaptador** incluido en el repo:

1. **Activa el servidor MCP** en NANPAD (Ajustes → Integración MCP) y deja la app abierta.
2. En tu editor, configura el servidor MCP apuntando al adaptador:
   - **Cursor:** archivo `.cursor/mcp.json` (en el proyecto o en tu usuario).
   - **VS Code:** archivo `.vscode/mcp.json` (en el workspace o en tu perfil).

Ejemplo de configuración (sustituye `RUTA_A_NANPAD` por la carpeta donde está clonado/instalado NANPAD y el puerto si lo cambiaste):

```json
{
  "servers": {
    "nanpad": {
      "type": "stdio",
      "command": "node",
      "args": ["RUTA_A_NANPAD/mcp-adapter/index.mjs"],
      "env": {
        "NANPAD_MCP_URL": "http://127.0.0.1:4242"
      }
    }
  }
}
```

El adaptador (`mcp-adapter/` en la raíz del repo) habla MCP por stdio con el editor y reenvía las llamadas a tools al HTTP de NANPAD. Instrucciones detalladas y el mismo bloque de configuración están en **Ajustes → Integración MCP** dentro de la app.

## Uso en la app (API interna)

El **Composition Root** (`nanpad-app`) instancia `McpServer` con todos los UseCases necesarios y lo expone como `mcpServer` en el grafo de dependencias. La API es:

- **`mcpServer.handle(request: McpRequest): Promise<McpResponse>`** — ejecuta la tool indicada y devuelve `{ success, data? | error? }`.
- **`mcpServer.listTools(): McpToolDescriptor[]`** — lista de tools para capability negotiation.

El servidor HTTP (Rust) recibe cada request, emite un evento al frontend, el frontend llama a `mcpServer.handle()` y devuelve la respuesta por IPC al backend, que responde al cliente HTTP.

## Persistencia de la configuración MCP

Los ajustes **Servidor MCP** (activado/desactivado) y **Puerto** se guardan en la misma tabla SQLite que el resto de preferencias (`app_settings`), con las claves `mcp_enabled` y `mcp_port`. Se cargan al iniciar la app y se persisten al cambiar el interruptor o el puerto en Ajustes.

## Seguridad del servidor MCP

- **Binding:** El servidor se enlaza solo a **127.0.0.1** (localhost). No escucha en interfaces de red ni en 0.0.0.0, así que no es accesible desde otros equipos.
- **Sin autenticación:** Cualquier proceso que pueda conectarse a localhost en ese puerto puede llamar a las tools (crear/editar tareas, categorías, etc.). Es aceptable en un uso 100 % local y en una máquina de un solo usuario.
- **Riesgos a tener en cuenta:**
  - **Malware o scripts locales:** Un programa malicioso en tu máquina podría usar el puerto MCP para modificar o leer datos de NANPAD. Mitigación: no activar MCP si no lo usas; desactivarlo cuando no necesites el agente.
  - **Varios usuarios en el mismo PC:** En un equipo compartido, otro usuario con sesión en la misma máquina podría acceder a 127.0.0.1 en tu puerto si conoce el puerto. En entornos multi-usuario, conviene dejar MCP desactivado por defecto o valorar restricciones adicionales (p. ej. token opcional en el futuro).
- **Recomendación:** Activar el servidor MCP solo cuando vayas a usar Cursor/VS Code u otro cliente con el adaptador, y desactivarlo cuando termines.
