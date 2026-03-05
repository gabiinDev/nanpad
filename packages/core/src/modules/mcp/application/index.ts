/**
 * API pública del módulo MCP.
 * SOLO se exportan las clases y tipos necesarios para el Composition Root.
 */

// ─── Servidor MCP ─────────────────────────────────────────────────────────────
export { McpServer } from "./usecases/McpServer.ts";
export type { McpServerDeps } from "./usecases/McpServer.ts";

// ─── Registro de tools (útil para extensión o testing) ───────────────────────
export { McpToolRegistry } from "./usecases/McpToolRegistry.ts";

// ─── Tipos del protocolo ─────────────────────────────────────────────────────
export type {
  McpRequest,
  McpResponse,
  McpToolDescriptor,
  McpToolHandler,
  McpToolEntry,
  McpParamSchema,
  McpParamType,
} from "./dtos/McpDTO.ts";
