/**
 * Registro de tools MCP.
 * Mantiene el mapa name → {descriptor, handler} y
 * provee métodos para registrar, listar y resolver tools.
 */

import type {
  McpToolDescriptor,
  McpToolHandler,
  McpToolEntry,
} from "../dtos/McpDTO.ts";

/**
 * Registro inmutable de tools MCP.
 * Las tools se añaden en el constructor del McpServer y no cambian en runtime.
 */
export class McpToolRegistry {
  private readonly tools = new Map<string, McpToolEntry>();

  /**
   * Registra una tool. Lanza si el nombre ya existe.
   * @throws {Error} Si se intenta registrar dos veces la misma tool.
   */
  register(descriptor: McpToolDescriptor, handler: McpToolHandler): void {
    if (this.tools.has(descriptor.name)) {
      throw new Error(
        `[McpToolRegistry] Tool '${descriptor.name}' ya está registrada.`
      );
    }
    this.tools.set(descriptor.name, { descriptor, handler });
  }

  /**
   * Retorna los descriptores de todas las tools registradas.
   * Usado para responder al listado de capabilities del agente.
   */
  listDescriptors(): McpToolDescriptor[] {
    return Array.from(this.tools.values()).map((e) => e.descriptor);
  }

  /**
   * Resuelve el handler de una tool por nombre.
   * @returns El entry de la tool, o undefined si no existe.
   */
  resolve(name: string): McpToolEntry | undefined {
    return this.tools.get(name);
  }

  /** Retorna true si la tool está registrada. */
  has(name: string): boolean {
    return this.tools.has(name);
  }
}
