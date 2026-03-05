/**
 * Entidad de dominio HistoryEntry.
 * Representa un registro inmutable de un cambio realizado sobre cualquier entidad.
 * No contiene lógica de negocio más allá de su creación.
 */

import { generateId, type EntityId } from "@shared/types/id";

/** Tipos de acción registrables en el historial. */
export type HistoryAction =
  | "create"
  | "update"
  | "delete"
  | "complete"
  | "restore"
  | "status_change"
  | "assign"
  | "unassign";

/** Props para reconstruir una HistoryEntry desde persistencia. */
export interface HistoryEntryProps {
  id: EntityId;
  entityType: string;
  entityId: EntityId;
  action: HistoryAction;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

/** Datos para crear una nueva HistoryEntry. */
export interface RecordChangeProps {
  entityType: string;
  entityId: EntityId;
  action: HistoryAction;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}

/**
 * Registro inmutable de un cambio sobre una entidad del dominio.
 * Una vez creado no puede modificarse.
 */
export class HistoryEntry {
  readonly id: EntityId;
  readonly entityType: string;
  readonly entityId: EntityId;
  readonly action: HistoryAction;
  readonly fieldName: string | null;
  readonly oldValue: string | null;
  readonly newValue: string | null;
  readonly createdAt: Date;

  private constructor(props: HistoryEntryProps) {
    this.id = props.id;
    this.entityType = props.entityType;
    this.entityId = props.entityId;
    this.action = props.action;
    this.fieldName = props.fieldName;
    this.oldValue = props.oldValue;
    this.newValue = props.newValue;
    this.createdAt = props.createdAt;
  }

  /**
   * Crea un nuevo registro de cambio con timestamp automático.
   * @param props - Datos del cambio a registrar.
   * @returns Nueva instancia de HistoryEntry con ID y timestamp generados.
   * @throws {Error} Si entityType o entityId están vacíos.
   */
  static record(props: RecordChangeProps): HistoryEntry {
    if (!props.entityType.trim()) {
      throw new Error("[HistoryEntry] entityType no puede estar vacío.");
    }
    if (!props.entityId.trim()) {
      throw new Error("[HistoryEntry] entityId no puede estar vacío.");
    }

    return new HistoryEntry({
      id: generateId(),
      entityType: props.entityType,
      entityId: props.entityId,
      action: props.action,
      fieldName: props.fieldName ?? null,
      oldValue: props.oldValue ?? null,
      newValue: props.newValue ?? null,
      createdAt: new Date(),
    });
  }

  /**
   * Reconstruye una HistoryEntry desde los datos de persistencia.
   * @param props - Props completos desde el repositorio.
   */
  static reconstitute(props: HistoryEntryProps): HistoryEntry {
    return new HistoryEntry(props);
  }
}
