#!/usr/bin/env node
/**
 * Adaptador MCP por stdio que reenvía a NANPAD (HTTP).
 * Para Cursor o VS Code: configurar como servidor stdio con este script y
 * NANPAD_MCP_URL=http://127.0.0.1:4242 (o el puerto que tenga la app).
 *
 * Uso: node index.mjs   (lee NANPAD_MCP_URL del entorno, por defecto http://127.0.0.1:4242)
 */

import { createInterface } from "readline";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
let TOOLS;
try {
  TOOLS = JSON.parse(readFileSync(join(__dirname, "tools.json"), "utf8"));
} catch (err) {
  process.stderr.write(`[nanpad-mcp] Error loading tools.json: ${err.message}\n`);
  process.exit(1);
}

const NANPAD_URL = process.env.NANPAD_MCP_URL || "http://127.0.0.1:4242";
const PROTOCOL_VERSION = "2024-11-05";

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

async function callNanpad(tool, params) {
  const res = await fetch(NANPAD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, params: params || {} }),
  });
  if (!res.ok) {
    return {
      success: false,
      error: `HTTP ${res.status}: ${await res.text()}`,
    };
  }
  return res.json();
}

async function handleMessage(msg) {
  const { jsonrpc, id, method, params } = msg || {};
  if (jsonrpc !== "2.0") return;

  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
        },
        serverInfo: {
          name: "nanpad-mcp-adapter",
          version: "0.1.0",
          description: "Adaptador MCP para NANPAD (tareas, categorías, adjuntos). Conecta con la app NANPAD por HTTP.",
        },
      },
    });
    return;
  }

  if (method === "notifications/initialized") {
    return;
  }

  if (method === "tools/list") {
    const tools = TOOLS.map((t) => ({
      ...t,
      inputSchema: typeof t.inputSchema === "object" && t.inputSchema !== null
        ? { type: "object", ...t.inputSchema }
        : { type: "object", properties: {} },
    }));
    send({
      jsonrpc: "2.0",
      id,
      result: { tools },
    });
    return;
  }

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};
    if (!name) {
      send({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "Missing tool name" },
      });
      return;
    }
    try {
      const nanpadResult = await callNanpad(name, args);
      const text =
        nanpadResult.success === true
          ? JSON.stringify(nanpadResult.data, null, 2)
          : `Error: ${nanpadResult.error || "Unknown"}`;
      send({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text }],
          isError: nanpadResult.success === false,
        },
      });
    } catch (err) {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        },
      });
    }
    return;
  }

  if (method === "resources/list" || method === "resources/templates/list") {
    send({ jsonrpc: "2.0", id, result: { resources: [] } });
    return;
  }

  if (method === "prompts/list") {
    send({ jsonrpc: "2.0", id, result: { prompts: [] } });
    return;
  }

  if (id !== undefined) {
    send({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  }
}

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    void handleMessage(msg);
  } catch (_) {
    // ignore invalid JSON
  }
});
