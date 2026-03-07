/**
 * Fakes para tests del módulo History.
 */

import type { IHistoryRepository } from "../../../infrastructure/persistence/HistoryRepository";
import { HistoryEntry } from "../../../domain/entities/HistoryEntry";
import type { EntityId } from "@shared/types/id";

/** Repositorio de historial en memoria para tests. */
export class InMemoryHistoryRepository implements IHistoryRepository {
  private entries = new Map<string, HistoryEntry>();
  /** Orden de inserción para desempate cuando createdAt coincide. */
  private insertOrder: string[] = [];

  async save(entry: HistoryEntry): Promise<void> {
    this.entries.set(entry.id, entry);
    this.insertOrder.push(entry.id);
  }

  async findByEntity(
    entityType: string,
    entityId: EntityId,
    options?: { limit?: number; offset?: number }
  ): Promise<HistoryEntry[]> {
    const list = [...this.entries.values()]
      .filter((e) => e.entityType === entityType && e.entityId === entityId)
      .sort((a, b) => {
        const byTime = b.createdAt.getTime() - a.createdAt.getTime();
        if (byTime !== 0) return byTime;
        return this.insertOrder.indexOf(b.id) - this.insertOrder.indexOf(a.id);
      });
    const offset = options?.offset ?? 0;
    const limit = options?.limit;
    return limit != null ? list.slice(offset, offset + limit) : list.slice(offset);
  }

  async countByEntity(entityType: string, entityId: EntityId): Promise<number> {
    return [...this.entries.values()].filter(
      (e) => e.entityType === entityType && e.entityId === entityId
    ).length;
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
