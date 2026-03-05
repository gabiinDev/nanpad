/**
 * UseCase: Actualizar una categoría existente.
 */

import type { ICategoryRepository } from "../../infrastructure/persistence/CategoryRepository.ts";
import type { IEventBus } from "@shared/event-bus/types.ts";
import { createEvent } from "@shared/event-bus/EventBus.ts";
import type { UpdateCategoryInput, CategoryDTO } from "../dtos/CategoryDTO.ts";
import { categoryToDTO } from "../dtos/mappers.ts";

/**
 * Actualiza los datos de una categoría existente.
 */
export class UpdateCategory {
  constructor(
    private readonly categoryRepository: ICategoryRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * @param input - ID y campos a actualizar.
   * @returns DTO de la categoría actualizada.
   * @throws {Error} Si la categoría no existe o el nombre está vacío.
   */
  async execute(input: UpdateCategoryInput): Promise<CategoryDTO> {
    const category = await this.categoryRepository.findById(input.id);
    if (!category) {
      throw new Error(`[UpdateCategory] Categoría no encontrada: ${input.id}`);
    }

    const updated = category.update({
      name: input.name,
      parentId: input.parentId,
      color: input.color,
      icon: input.icon,
      sortOrder: input.sortOrder,
    });

    await this.categoryRepository.save(updated);

    this.eventBus.emitAsync(
      createEvent("category.updated", { categoryId: updated.id, name: updated.name })
    );

    return categoryToDTO(updated);
  }
}
