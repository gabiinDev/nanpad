/**
 * Tipos del protocolo MCP (Model Context Protocol) para NANPAD.
 * Define la forma de los requests, responses y la descripción de cada tool
 * que el módulo MCP expone a agentes de IA.
 */

// ─── Tipos primitivos del protocolo ──────────────────────────────────────────

/** Tipos de parámetros soportados en la descripción de una tool. */
export type McpParamType = "string" | "number" | "boolean" | "array" | "object";

/** Descripción de un parámetro de una tool MCP. */
export interface McpParamSchema {
  type: McpParamType;
  description: string;
  required?: boolean;
  /** Para type "array": tipo de los elementos. */
  items?: { type: McpParamType };
  /** Para type "string": valores permitidos. */
  enum?: string[];
}

/** Descriptor de una tool que el servidor MCP expone. */
export interface McpToolDescriptor {
  /** Nombre único de la tool (snake_case). */
  name: string;
  /** Descripción legible para el agente de IA. */
  description: string;
  /** Esquema de parámetros de entrada. */
  inputSchema: Record<string, McpParamSchema>;
}

// ─── Request / Response ───────────────────────────────────────────────────────

/** Request entrante desde un agente de IA. */
export interface McpRequest {
  /** Nombre de la tool a invocar. */
  tool: string;
  /** Parámetros enviados por el agente. */
  params: Record<string, unknown>;
}

/** Response del servidor MCP hacia el agente. */
export interface McpResponse {
  /** true si la tool ejecutó correctamente. */
  success: boolean;
  /** Resultado de la tool (solo cuando success = true). */
  data?: unknown;
  /** Mensaje de error legible (solo cuando success = false). */
  error?: string;
}

// ─── Tipos internos del registro de tools ────────────────────────────────────

/**
 * Handler tipado que ejecuta la lógica de una tool.
 * Recibe los parámetros raw del request y retorna los datos de resultado.
 */
export type McpToolHandler = (
  params: Record<string, unknown>
) => Promise<unknown>;

/** Entrada del registro de tools: descriptor + handler. */
export interface McpToolEntry {
  descriptor: McpToolDescriptor;
  handler: McpToolHandler;
}
