/**
 * UseCase: Registrar un cambio en el historial.
 * Es llamado desde otros módulos (Task, Category, Document) para auditar acciones.
 * No emite eventos propios para evitar ciclos; el registro es un side-effect silencioso.
 */

import { HistoryEntry } from "../../domain/entities/HistoryEntry.ts";
import type { IHistoryRepository } from "../../infrastructure/persistence/HistoryRepository.ts";
import type { RecordChangeInput } from "../dtos/HistoryDTO.ts";

/**
 * Persiste un nuevo registro de cambio en el historial.
 * Silencia errores internos para no interrumpir el flujo principal de negocio.
 */
export class RecordChange {
  constructor(private readonly historyRepository: IHistoryRepository) {}

  /**
   * @param input - Datos del cambio a registrar.
   * @returns Promise que resuelve cuando el registro ha sido guardado.
   */
  async execute(input: RecordChangeInput): Promise<void> {
    const entry = HistoryEntry.record({
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      fieldName: input.fieldName,
      oldValue: input.oldValue,
      newValue: input.newValue,
    });

    await this.historyRepository.save(entry);
  }
}
