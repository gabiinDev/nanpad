/**
 * UseCase: Listar categorías con jerarquía opcional.
 */

import type { ICategoryRepository } from "../../infrastructure/persistence/CategoryRepository.ts";
import type { ListCategoriesInput, CategoryDTO } from "../dtos/CategoryDTO.ts";
import { categoryToDTO } from "../dtos/mappers.ts";
import type { Category } from "../../domain/entities/Category.ts";

/**
 * Lista categorías aplicando filtros opcionales.
 * Cuando `includeChildren` es true, construye un árbol anidado con la propiedad
 * `children` en cada DTO raíz.
 */
export class ListCategories {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  /**
   * @param input - Opciones de listado.
   * @returns Array de CategoryDTO (plano o en árbol según `includeChildren`).
   */
  async execute(input: ListCategoriesInput = {}): Promise<CategoryDTO[]> {
    if (input.includeChildren) {
      return this.listAsTree();
    }

    const categories = await this.categoryRepository.findAll(
      input.parentId !== undefined ? { parentId: input.parentId } : undefined
    );

    return categories.map((c) => categoryToDTO(c));
  }

  /**
   * Construye un árbol completo de categorías.
   * Carga todas las categorías y las organiza por parent_id.
   */
  private async listAsTree(): Promise<CategoryDTO[]> {
    const all = await this.categoryRepository.findAll();
    return buildTree(all, null);
  }
}

/**
 * Construye recursivamente el árbol de categorías.
 * @param all - Todas las categorías disponibles.
 * @param parentId - ID del padre para el nivel actual (null para raíces).
 */
function buildTree(all: Category[], parentId: string | null): CategoryDTO[] {
  return all
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((c) => categoryToDTO(c, buildTree(all, c.id)));
}
