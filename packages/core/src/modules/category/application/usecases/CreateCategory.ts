/**
 * UseCase: Crear una nueva categoría.
 */

import { Category } from "@modules/category/domain/entities/Category";
import type { ICategoryRepository } from "@modules/category/infrastructure/persistence/CategoryRepository";
import type { IEventBus } from "@shared/event-bus/types";
import { createEvent } from "@shared/event-bus/EventBus";
import type { CreateCategoryInput, CategoryDTO } from "@modules/category/application/dtos/CategoryDTO";
import { categoryToDTO } from "@modules/category/application/dtos/mappers";

/**
 * Crea una nueva categoría y la persiste.
 * Emite el evento "category.created" al finalizar.
 */
export class CreateCategory {
  constructor(
    private readonly categoryRepository: ICategoryRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * @param input - Datos de la categoría a crear.
   * @returns DTO de la categoría creada.
   * @throws {Error} Si el nombre está vacío.
   */
  async execute(input: CreateCategoryInput): Promise<CategoryDTO> {
    const category = Category.create({
      name: input.name,
      parentId: input.parentId,
      color: input.color,
      icon: input.icon,
      sortOrder: input.sortOrder,
    });

    await this.categoryRepository.save(category);

    this.eventBus.emitAsync(
      createEvent("category.created", { categoryId: category.id, name: category.name })
    );

    return categoryToDTO(category);
  }
}
