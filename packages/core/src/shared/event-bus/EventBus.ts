/**
 * Implementación del Event Bus tipado e inyectable.
 * Soporta publicación síncrona y asíncrona (fire-and-forget).
 * Sin estado global — instanciar en el Composition Root e inyectar.
 */

import type {
  IEventBus,
  AppEvent,
  EventHandler,
  EventPayload,
} from "./types.ts";

/** @internal Map de tipo de evento a lista de handlers registrados. */
type HandlerMap = Map<string, EventHandler[]>;

/**
 * Implementación concreta del Event Bus.
 * Instanciar una sola vez en el Composition Root y pasar por inyección.
 */
export class EventBus implements IEventBus {
  private readonly handlers: HandlerMap = new Map();

  /**
   * Suscribe un handler a un tipo de evento.
   * @param type - Tipo de evento (ej. "task.created").
   * @param handler - Función a ejecutar cuando se emite el evento.
   * @returns Función unsubscribe para cancelar la suscripción.
   */
  on<T extends EventPayload>(
    type: string,
    handler: EventHandler<T>
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    // Cast seguro: los handlers se tipan internamente pero se almacenan de forma genérica
    this.handlers.get(type)!.push(handler as EventHandler);
    return () => this.off(type, handler);
  }

  /**
   * Cancela la suscripción de un handler específico.
   * @param type - Tipo de evento.
   * @param handler - Handler a eliminar.
   */
  off<T extends EventPayload>(type: string, handler: EventHandler<T>): void {
    const list = this.handlers.get(type);
    if (!list) return;
    const idx = list.indexOf(handler as EventHandler);
    if (idx !== -1) list.splice(idx, 1);
  }

  /**
   * Publica un evento de forma síncrona.
   * Todos los handlers registrados para el tipo se ejecutan antes de retornar.
   * @param event - Evento a publicar.
   * @throws Propaga errores de los handlers síncronos.
   */
  emit<T extends EventPayload>(event: AppEvent<T>): void {
    const list = this.handlers.get(event.type);
    if (!list || list.length === 0) return;
    for (const handler of [...list]) {
      handler(event as AppEvent);
    }
  }

  /**
   * Publica un evento de forma asíncrona (fire-and-forget).
   * Los handlers se ejecutan en la siguiente microtarea; errores se silencian.
   * Usar para side-effects no críticos (ej. logging, indexación).
   * @param event - Evento a publicar.
   */
  emitAsync<T extends EventPayload>(event: AppEvent<T>): void {
    const list = this.handlers.get(event.type);
    if (!list || list.length === 0) return;
    for (const handler of [...list]) {
      Promise.resolve()
        .then(() => handler(event as AppEvent))
        .catch((err: unknown) => {
          console.error(
            `[EventBus] Error en handler asíncrono para "${event.type}":`,
            err
          );
        });
    }
  }

  /** Elimina todos los handlers (útil en tests). */
  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Crea un nuevo evento con timestamp automático.
 * @param type - Tipo del evento.
 * @param payload - Datos del evento.
 * @returns AppEvent listo para emitir.
 */
export function createEvent<T extends EventPayload>(
  type: string,
  payload: T
): AppEvent<T> {
  return {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
}
