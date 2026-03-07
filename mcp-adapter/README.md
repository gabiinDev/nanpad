# Adaptador MCP para NANPAD

Servidor MCP por **stdio** que reenvía las llamadas al servidor HTTP de NANPAD. Pensado para usarse desde **Cursor** o **VS Code** como servidor MCP.

## Requisitos

- **NANPAD** en ejecución con el servidor MCP activado (Ajustes → Integración MCP).
- **Node.js** 18+ (para ejecutar este script).

## Uso

Variable de entorno opcional:

- `NANPAD_MCP_URL`: URL del servidor HTTP de NANPAD (por defecto `http://127.0.0.1:4242`).

Ejemplo:

```bash
export NANPAD_MCP_URL="http://127.0.0.1:4242"
node index.mjs
```

O desde la raíz del repo NANPAD:

```bash
node mcp-adapter/index.mjs
```

## Configuración en Cursor o VS Code

En la app NANPAD, ve a **Ajustes → Integración MCP**. Ahí se muestra el JSON de ejemplo para `.cursor/mcp.json` (Cursor) o `.vscode/mcp.json` (VS Code), con la ruta al adaptador y el puerto configurado.

Resumen: en `mcp.json` añade un servidor de tipo `stdio` con `command: "node"` y `args` apuntando a `index.mjs` de esta carpeta, y `env.NANPAD_MCP_URL` con la URL y puerto que use NANPAD.

## Verificación

### 1. Comprobar que el servidor HTTP de NANPAD responde

- En NANPAD: **Ajustes → Integración MCP** → activa el servidor y pulsa **"Probar conexión"**. Debe aparecer ✓.
- Desde terminal (mismo puerto que en NANPAD, ej. 4242):

  ```bash
  curl -X POST http://127.0.0.1:4242 -H "Content-Type: application/json" -d "{\"tool\":\"list_tasks\",\"params\":{}}"
  ```

  Debe devolver JSON (p. ej. `{"success":true,"data":[...]}`).

### 2. Comprobar que el adaptador lista las herramientas

El editor (Cursor/VS Code) obtiene la lista de herramientas por **stdio** desde este adaptador (no desde NANPAD). Si "no hay herramientas", suele ser: ruta incorrecta en `args`, `NANPAD_MCP_URL` con otro puerto, o el proceso del adaptador no arranca.

Prueba manual del adaptador:

```bash
cd /ruta/al/NANPAD
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node mcp-adapter/index.mjs
```

Deberías ver una línea JSON con `"result":{"tools":[...]}` y varias herramientas (create_task, list_tasks, etc.). Si no aparece nada o hay error, revisa que la ruta al `index.mjs` sea correcta y que Node.js esté en el PATH cuando Cursor ejecuta el comando.
