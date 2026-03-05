/**
 * DTOs del módulo History.
 * Contrato público entre este módulo y el resto de la aplicación.
 */

import type { HistoryAction } from "../../domain/entities/HistoryEntry";

/** DTO de un registro de historial. */
export interface HistoryEntryDTO {
  id: string;
  entityType: string;
  entityId: string;
  action: HistoryAction;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

/** Input para RecordChange. */
export interface RecordChangeInput {
  entityType: string;
  entityId: string;
  action: HistoryAction;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}

/** Input para GetEntityHistory. */
export interface GetEntityHistoryInput {
  entityType: string;
  entityId: string;
}
