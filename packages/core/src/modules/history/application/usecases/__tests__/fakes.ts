/**
 * Fakes para tests del módulo History.
 */

import type { IHistoryRepository } from "../../../infrastructure/persistence/HistoryRepository";
import { HistoryEntry } from "../../../domain/entities/HistoryEntry";
import type { EntityId } from "@shared/types/id";

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
