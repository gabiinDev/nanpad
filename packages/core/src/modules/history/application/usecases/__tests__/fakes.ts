/**
 * Fakes para tests del módulo History.
 */

import type { IHistoryRepository } from "../../../infrastructure/persistence/HistoryRepository.ts";
import { HistoryEntry } from "../../../domain/entities/HistoryEntry.ts";
import type { EntityId } from "@shared/types/id.ts";

/** Repositorio de historial en memoria para tests. */
export class InMemoryHistoryRepository implements IHistoryRepository {
  private entries = new Map<string, HistoryEntry>();

  async save(entry: HistoryEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async findByEntity(
    entityType: string,
    entityId: EntityId
  ): Promise<HistoryEntry[]> {
    return [...this.entries.values()]
      .filter((e) => e.entityType === entityType && e.entityId === entityId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async findByEntityType(entityType: string): Promise<HistoryEntry[]> {
    return [...this.entries.values()]
      .filter((e) => e.entityType === entityType)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getAll(): HistoryEntry[] {
    return [...this.entries.values()];
  }
}
