/**
 * Implementación del repositorio de historial sobre IDatabase.
 * Los registros de historial son inmutables: solo INSERT, nunca UPDATE/DELETE.
 */

import type { IDatabase } from "@infra/db/IDatabase";
import type { IHistoryRepository } from "../HistoryRepository";
import { HistoryEntry } from "../../../domain/entities/HistoryEntry";
import type { HistoryAction } from "../../../domain/entities/HistoryEntry";
import type { HistoryEntryRow } from "@infra/db/schema";
import type { EntityId } from "@shared/types/id";

/**
 * Repositorio de historial que opera sobre cualquier implementación de IDatabase.
 * Recibe la instancia por inyección desde el Composition Root.
 */
export class HistorySqliteRepository implements IHistoryRepository {
  constructor(private readonly db: IDatabase) {}

  async save(entry: HistoryEntry): Promise<void> {
    await this.db.execute(
      `INSERT INTO history_entries
        (id, entity_type, entity_id, action, field_name, old_value, new_value, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        entry.id,
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.fieldName,
        entry.oldValue,
        entry.newValue,
        entry.createdAt.toISOString(),
      ]
    );
  }

  async findByEntity(
    entityType: string,
    entityId: EntityId,
    options?: { limit?: number; offset?: number }
  ): Promise<HistoryEntry[]> {
    const limit = options?.limit;
    const offset = options?.offset ?? 0;
    const limitClause = limit != null ? ` LIMIT ${Math.max(0, limit)}` : "";
    const offsetClause = offset > 0 ? ` OFFSET ${offset}` : "";
    const rows = await this.db.select<HistoryEntryRow[]>(
      `SELECT * FROM history_entries
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC${limitClause}${offsetClause}`,
      [entityType, entityId]
    );
    return rows.map(rowToHistoryEntry);
  }

  async countByEntity(entityType: string, entityId: EntityId): Promise<number> {
    const rows = await this.db.select<{ count: number | string }[]>(
      `SELECT COUNT(*) as count FROM history_entries
       WHERE entity_type = $1 AND entity_id = $2`,
      [entityType, entityId]
    );
    const n = rows[0]?.count;
    return n != null ? Number(n) : 0;
  }

  async findByEntityType(entityType: string): Promise<HistoryEntry[]> {
    const rows = await this.db.select<HistoryEntryRow[]>(
      `SELECT * FROM history_entries
       WHERE entity_type = $1
       ORDER BY created_at ASC`,
      [entityType]
    );
    return rows.map(rowToHistoryEntry);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToHistoryEntry(row: HistoryEntryRow): HistoryEntry {
  return HistoryEntry.reconstitute({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action as HistoryAction,
    fieldName: row.field_name,
    oldValue: row.old_value,
    newValue: row.new_value,
    createdAt: new Date(row.created_at),
  });
}
