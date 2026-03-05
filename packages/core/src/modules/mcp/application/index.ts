/**
 * API pública del módulo MCP.
 * SOLO se exportan las clases y tipos necesarios para el Composition Root.
 */

// ─── Servidor MCP ─────────────────────────────────────────────────────────────
export { McpServer } from "./usecases/McpServer";
export type { McpServerDeps } from "./usecases/McpServer";

// ─── Registro de tools (útil para extensión o testing) ───────────────────────
export { McpToolRegistry } from "./usecases/McpToolRegistry";

// ─── Tipos del protocolo ─────────────────────────────────────────────────────
export type {
  McpRequest,
  McpResponse,
  McpToolDescriptor,
  McpToolHandler,
  McpToolEntry,
  McpParamSchema,
  McpParamType,
} from "./dtos/McpDTO";
