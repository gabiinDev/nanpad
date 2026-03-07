/**
 * Tipos base para el Event Bus tipado de NANPAD.
 * El Event Bus es siempre inyectado; nunca se usa como singleton global.
 */

/** Payload genérico de un evento. */
export type EventPayload = Record<string, unknown>;

/** Tipo base de todos los eventos del sistema. */
export interface AppEvent<T extends EventPayload = EventPayload> {
  /** Nombre del evento (ej. "task.created", "category.deleted"). */
  readonly type: string;
  /** Datos asociados al evento. */
  readonly payload: T;
  /** Timestamp ISO del momento de emisión. */
  readonly timestamp: string;
}

/** Handler de un evento. Puede ser síncrono o retornar una promesa. */
export type EventHandler<T extends EventPayload = EventPayload> = (
  event: AppEvent<T>
) => void | Promise<void>;

/** Contrato del Event Bus inyectable. */
export interface IEventBus {
  /**
   * Publica un evento de forma síncrona (todos los handlers se ejecutan antes de retornar).
   * Usar cuando se requiera consistencia inmediata.
   * @param event - El evento a publicar.
   */
  emit<T extends EventPayload>(event: AppEvent<T>): void;

  /**
   * Publica un evento de forma asíncrona (fire-and-forget).
   * Usar para side-effects no críticos.
   * @param event - El evento a publicar.
   */
  emitAsync<T extends EventPayload>(event: AppEvent<T>): void;

  /**
   * Suscribe un handler a un tipo de evento.
   * @param type - Nombre del tipo de evento.
   * @param handler - Función que se ejecuta al recibir el evento.
   * @returns Función para cancelar la suscripción.
   */
  on<T extends EventPayload>(
    type: string,
    handler: EventHandler<T>
  ): () => void;

  /**
   * Cancela una suscripción específica.
   * @param type - Nombre del tipo de evento.
   * @param handler - Handler a eliminar.
   */
  off<T extends EventPayload>(type: string, handler: EventHandler<T>): void;
}

// --- Definición de eventos del dominio ---

/** Eventos del módulo Task */
export interface TaskCreatedPayload extends EventPayload {
  taskId: string;
  title: string;
}

export interface TaskUpdatedPayload extends EventPayload {
  taskId: string;
  fields: string[];
}

export interface TaskStatusChangedPayload extends EventPayload {
  taskId: string;
  oldStatus: string;
  newStatus: string;
}

export interface TaskCompletedPayload extends EventPayload {
  taskId: string;
  completedAt: string;
}

export interface TaskRestoredPayload extends EventPayload {
  taskId: string;
}

export interface TaskSubtaskAddedPayload extends EventPayload {
  taskId: string;
  subtaskId: string;
  title: string;
}

export interface TaskSubtaskRemovedPayload extends EventPayload {
  taskId: string;
  subtaskId: string;
  title: string;
}

export interface TaskSubtaskCompletedPayload extends EventPayload {
  taskId: string;
  subtaskId: string;
  title: string;
  completed: boolean;
}

export interface TaskAttachmentAddedPayload extends EventPayload {
  taskId: string;
  snippetId: string;
  filePath: string | null;
}

export interface TaskAttachmentRemovedPayload extends EventPayload {
  taskId: string;
  snippetId: string;
  filePath: string | null;
}

/** Eventos del módulo Category */
export interface CategoryCreatedPayload extends EventPayload {
  categoryId: string;
  name: string;
}

export interface CategoryUpdatedPayload extends EventPayload {
  categoryId: string;
  name: string;
}

export interface CategoryDeletedPayload extends EventPayload {
  categoryId: string;
  reassignedTo?: string;
}

/** Eventos del módulo Document */
export interface DocumentCreatedPayload extends EventPayload {
  documentId: string;
  title: string;
}

export interface DocumentUpdatedPayload extends EventPayload {
  documentId: string;
}

export interface DocumentDeletedPayload extends EventPayload {
  documentId: string;
}
