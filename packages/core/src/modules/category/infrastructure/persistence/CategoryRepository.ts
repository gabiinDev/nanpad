/**
 * Interfaz del repositorio de categorías.
 * Define el contrato de persistencia para el módulo Category.
 * Las implementaciones concretas están en sqlite/.
 */

import type { Category } from "../../domain/entities/Category";
import type { EntityId } from "@shared/types/id";

/**
 * Filtros para buscar categorías.
 */
export interface CategoryFilters {
  /** Si se especifica, devuelve solo las categorías con ese parentId
   *  (null para las raíz, un ID para las hijas de ese padre). */
  parentId?: EntityId | null;
}

/**
 * Contrato del repositorio de categorías.
 * Todas las operaciones son asíncronas.
 */
export interface ICategoryRepository {
  /**
   * Guarda una categoría nueva o actualiza una existente.
   * @param category - Entidad Category a persistir.
   */
  save(category: Category): Promise<void>;

  /**
   * Busca una categoría por su ID.
   * @param id - ID de la categoría.
   * @returns La categoría encontrada o null si no existe.
   */
  findById(id: EntityId): Promise<Category | null>;

  /**
   * Lista todas las categorías, con filtros opcionales.
   * @param filters - Filtros de búsqueda.
   * @returns Array de categorías que coinciden.
   */
  findAll(filters?: CategoryFilters): Promise<Category[]>;

  /**
   * Elimina una categoría por su ID.
   * No aplica ninguna estrategia de reasignación; eso es responsabilidad del UseCase.
   * @param id - ID de la categoría a eliminar.
   */
  delete(id: EntityId): Promise<void>;

  /**
   * Desasigna la categoría de todas las tareas que la tienen asignada.
   * @param categoryId - ID de la categoría a desasignar.
   */
  unassignFromAllTasks(categoryId: EntityId): Promise<void>;

  /**
   * Reasigna todas las tareas de una categoría a otra.
   * @param fromCategoryId - Categoría origen.
   * @param toCategoryId - Categoría destino.
   */
  reassignTasks(fromCategoryId: EntityId, toCategoryId: EntityId): Promise<void>;
}
