/**
 * Funciones de mapeo entre entidades de dominio y DTOs del módulo Category.
 */

import type { Category } from "../../domain/entities/Category.ts";
import type { CategoryDTO } from "./CategoryDTO.ts";

/**
 * Convierte una entidad Category a su DTO.
 * @param category - Entidad de dominio.
 * @param children - Subcategorías anidadas opcionales.
 * @returns DTO serializable de la categoría.
 */
export function categoryToDTO(
  category: Category,
  children?: CategoryDTO[]
): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    parentId: category.parentId,
    color: category.color,
    icon: category.icon,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    ...(children !== undefined && { children }),
  };
}
