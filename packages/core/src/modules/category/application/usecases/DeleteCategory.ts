/**
 * UseCase: Eliminar una categoría de forma segura.
 * Antes de eliminar, aplica la estrategia indicada sobre las tareas asignadas:
 * - "unassign": desasigna las tareas.
 * - "reassign": reasigna las tareas a otra categoría.
 */

import type { ICategoryRepository } from "../../infrastructure/persistence/CategoryRepository.ts";
import type { IEventBus } from "@shared/event-bus/types.ts";
import { createEvent } from "@shared/event-bus/EventBus.ts";
import type { DeleteCategoryInput } from "../dtos/CategoryDTO.ts";

/**
 * Elimina una categoría de forma segura sin borrado en cascada no controlado.
 */
export class DeleteCategory {
  constructor(
    private readonly categoryRepository: ICategoryRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * @param input - ID de la categoría y estrategia de gestión de tareas.
   * @throws {Error} Si la categoría no existe.
   * @throws {Error} Si strategy === "reassign" pero no se proporciona `reassignToId`.
   * @throws {Error} Si la categoría destino de reasignación no existe.
   */
  async execute(input: DeleteCategoryInput): Promise<void> {
    const category = await this.categoryRepository.findById(input.id);
    if (!category) {
      throw new Error(`[DeleteCategory] Categoría no encontrada: ${input.id}`);
    }

    if (input.strategy === "reassign") {
      if (!input.reassignToId) {
        throw new Error(
          "[DeleteCategory] Se requiere `reassignToId` cuando la estrategia es 'reassign'."
        );
      }
      const target = await this.categoryRepository.findById(input.reassignToId);
      if (!target) {
        throw new Error(
          `[DeleteCategory] Categoría destino de reasignación no encontrada: ${input.reassignToId}`
        );
      }
      await this.categoryRepository.reassignTasks(input.id, input.reassignToId);
    } else {
      await this.categoryRepository.unassignFromAllTasks(input.id);
    }

    await this.categoryRepository.delete(input.id);

    this.eventBus.emitAsync(
      createEvent("category.deleted", { categoryId: input.id })
    );
  }
}
