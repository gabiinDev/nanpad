/**
 * Shared Kernel — NANPAD
 * Exporta solo lo mínimo necesario: Event Bus, tipos de ID y Result.
 * No contiene lógica de negocio; no depende de ningún módulo.
 */

export { EventBus, createEvent } from "./event-bus/EventBus";
export type {
  IEventBus,
  AppEvent,
  EventHandler,
  EventPayload,
  TaskCreatedPayload,
  TaskUpdatedPayload,
  TaskStatusChangedPayload,
  TaskCompletedPayload,
  TaskRestoredPayload,
  CategoryCreatedPayload,
  CategoryDeletedPayload,
  DocumentCreatedPayload,
  DocumentUpdatedPayload,
} from "./event-bus/types";

export { generateId, isValidId } from "./types/id";
export type { EntityId } from "./types/id";

export { ok, err } from "./types/result";
export type { Result, Ok, Err } from "./types/result";
