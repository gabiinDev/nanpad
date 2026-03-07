/**
 * Listener de eventos del sistema que registra cambios en el historial.
 * Se suscribe al Event Bus en el Composition Root y llama a RecordChange
 * por cada evento de dominio relevante.
 *
 * Este enfoque desacopla el módulo History de Task y Category:
 * ningún UseCase de Task/Category importa nada de History.
 */

import type { IEventBus } from "@shared/event-bus/types";
import type {
  TaskCreatedPayload,
  TaskUpdatedPayload,
  TaskStatusChangedPayload,
  TaskCompletedPayload,
  TaskRestoredPayload,
  TaskSubtaskAddedPayload,
  TaskSubtaskRemovedPayload,
  TaskSubtaskCompletedPayload,
  TaskAttachmentAddedPayload,
  TaskAttachmentRemovedPayload,
  CategoryCreatedPayload,
  CategoryUpdatedPayload,
  CategoryDeletedPayload,
} from "@shared/event-bus/types";
import type { AppEvent } from "@shared/event-bus/types";
import { RecordChange } from "./RecordChange";
import type { IHistoryRepository } from "../../infrastructure/persistence/HistoryRepository";

/**
 * Registra en el historial los eventos de dominio emitidos por otros módulos.
 * Inicializar en el Composition Root una única vez:
 *
 * @example
 * ```ts
 * const listener = new HistoryEventListener(historyRepo, eventBus);
 * listener.subscribe();
 * ```
 */
export class HistoryEventListener {
  private readonly recordChange: RecordChange;
  private readonly unsubscribers: Array<() => void> = [];

  constructor(
    historyRepository: IHistoryRepository,
    private readonly eventBus: IEventBus
  ) {
    this.recordChange = new RecordChange(historyRepository);
  }

  /**
   * Suscribe el listener a todos los eventos de dominio que deben registrarse.
   * @returns Función para cancelar todas las suscripciones.
   */
  subscribe(): () => void {
    this.unsubscribers.push(
      this.eventBus.on<TaskCreatedPayload>(
        "task.created",
        (e: AppEvent<TaskCreatedPayload>) => {
          this.record({
            entityType: "task",
            entityId: e.payload.taskId,
            action: "create",
            newValue: e.payload.title,
          });
        }
      ),

      this.eventBus.on<TaskUpdatedPayload>(
        "task.updated",
        (e: AppEvent<TaskUpdatedPayload>) => {
          this.record({
            entityType: "task",
            entityId: e.payload.taskId,
            action: "update",
            newValue: e.payload.fields.join(", "),
          });
        }
      ),

      this.eventBus.on<TaskStatusChangedPayload>(
        "task.status_changed",
        (e: AppEvent<TaskStatusChangedPayload>) => {
          this.record({
            entityType: "task",
            entityId: e.payload.taskId,
            action: "status_change",
            fieldName: "status",
            oldValue: e.payload.oldStatus,
            newValue: e.payload.newStatus,
          });
        }
      ),

      this.eventBus.on<TaskCompletedPayload>(
        "task.completed",
        (e: AppEvent<TaskCompletedPayload>) => {
          this.record({
            entityType: "task",
            entityId: e.payload.taskId,
            action: "complete",
            fieldName: "completedAt",
            newValue: e.payload.completedAt,
          });
        }
      ),

      this.eventBus.on<TaskRestoredPayload>(
        "task.restored",
        (e: AppEvent<TaskRestoredPayload>) => {
          this.record({
            entityType: "task",
            entityId: e.payload.taskId,
            action: "restore",
          });
        }
      ),

      this.eventBus.on<TaskSubtaskAddedPayload>(
        "task.subtask.added",
        (e: AppEvent<TaskSubtaskAddedPayload>) => {
          this.record({
            entityType: "task",
            entityId: e.payload.taskId,
            action: "subtask_added",
            fieldName: "subtask",
            newValue: e.payload.title,
          });
        }
      ),

      this.eventBus.on<TaskSubtaskRemovedPayload>(
        "task.subtask.removed",
        (e: AppEvent<TaskSubtaskRemovedPayload>) => {
          this.record({
            entityType: "task",
            entityId: e.payload.taskId,
            action: "subtask_removed",
            fieldName: "subtask",
            newValue: e.payload.title,
          });
        }
      ),

      this.eventBus.on<TaskSubtaskCompletedPayload>(
        "task.subtask.completed",
        (e: AppEvent<TaskSubtaskCompletedPayload>) => {
          this.record({
            entityType: "task",
            entityId: e.payload.taskId,
            action: "subtask_completed",
            fieldName: "subtask",
            oldValue: e.payload.completed ? "pendiente" : "completada",
            newValue: e.payload.completed ? "completada" : "pendiente",
          });
        }
      ),

      this.eventBus.on<TaskAttachmentAddedPayload>(
        "task.attachment.added",
        (e: AppEvent<TaskAttachmentAddedPayload>) => {
          this.record({
            entityType: "task",
            entityId: e.payload.taskId,
            action: "attachment_added",
            fieldName: "adjunto",
            newValue: e.payload.filePath ?? "Adjunto",
          });
        }
      ),

      this.eventBus.on<TaskAttachmentRemovedPayload>(
        "task.attachment.removed",
        (e: AppEvent<TaskAttachmentRemovedPayload>) => {
          this.record({
            entityType: "task",
            entityId: e.payload.taskId,
            action: "attachment_removed",
            fieldName: "adjunto",
            newValue: e.payload.filePath ?? "Adjunto",
          });
        }
      ),

      this.eventBus.on<CategoryCreatedPayload>(
        "category.created",
        (e: AppEvent<CategoryCreatedPayload>) => {
          this.record({
            entityType: "category",
            entityId: e.payload.categoryId,
            action: "create",
            newValue: e.payload.name,
          });
        }
      ),

      this.eventBus.on<CategoryUpdatedPayload>(
        "category.updated",
        (e: AppEvent<CategoryUpdatedPayload>) => {
          this.record({
            entityType: "category",
            entityId: e.payload.categoryId,
            action: "update",
            newValue: e.payload.name,
          });
        }
      ),

      this.eventBus.on<CategoryDeletedPayload>(
        "category.deleted",
        (e: AppEvent<CategoryDeletedPayload>) => {
          this.record({
            entityType: "category",
            entityId: e.payload.categoryId,
            action: "delete",
          });
        }
      )
    );

    return () => this.unsubscribe();
  }

  /** Cancela todas las suscripciones activas. */
  unsubscribe(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers.length = 0;
  }

  /**
   * Registra un cambio en el historial de forma silenciosa.
   * Los errores se absorben para no interrumpir el flujo principal.
   */
  private record(input: Parameters<RecordChange["execute"]>[0]): void {
    this.recordChange.execute(input).catch((err: unknown) => {
      console.error("[HistoryEventListener] Error al registrar en historial:", err);
    });
  }
}
