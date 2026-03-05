/**
 * DTOs del módulo Category.
 * Son el único contrato público entre este módulo y el resto de la aplicación.
 * No contienen lógica; solo estructuras de datos serializables.
 */

/** DTO de una categoría. */
export interface CategoryDTO {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  /** Subcategorías anidadas (solo cuando se pide con includeChildren). */
  children?: CategoryDTO[];
}

/** Input para CreateCategory. */
export interface CreateCategoryInput {
  name: string;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

/** Input para UpdateCategory. */
export interface UpdateCategoryInput {
  id: string;
  name?: string;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

/** Input para DeleteCategory. */
export interface DeleteCategoryInput {
  id: string;
  /**
   * Estrategia para las tareas asignadas a la categoría eliminada.
   * - "unassign": desasigna las tareas sin reasignarlas.
   * - "reassign": reasigna las tareas a la categoría indicada en `reassignToId`.
   */
  strategy: "unassign" | "reassign";
  /** ID de la categoría destino cuando strategy === "reassign". */
  reassignToId?: string;
}

/** Filtros para ListCategories. */
export interface ListCategoriesInput {
  /** Si true, incluye hijos anidados en el campo `children` de cada DTO. */
  includeChildren?: boolean;
  /** Si se especifica, filtra solo por el padre indicado. */
  parentId?: string | null;
}
