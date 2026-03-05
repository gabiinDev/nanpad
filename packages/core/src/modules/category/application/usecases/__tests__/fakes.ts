/**
 * Fakes para tests del módulo Category.
 * Implementaciones en memoria de ICategoryRepository.
 */

import type {
  ICategoryRepository,
  CategoryFilters,
} from "../../../infrastructure/persistence/CategoryRepository.ts";
import type { Category } from "../../../domain/entities/Category.ts";
import type { EntityId } from "@shared/types/id.ts";

/** Repositorio de categorías en memoria para tests. */
export class InMemoryCategoryRepository implements ICategoryRepository {
  private categories = new Map<string, Category>();
  /** Mapa de taskId -> categoryIds asignadas (simula task_categories). */
  private taskCategories = new Map<string, Set<string>>();

  async save(category: Category): Promise<void> {
    this.categories.set(category.id, category);
  }

  async findById(id: EntityId): Promise<Category | null> {
    return this.categories.get(id) ?? null;
  }

  async findAll(filters?: CategoryFilters): Promise<Category[]> {
    let results = [...this.categories.values()];

    if (filters?.parentId !== undefined) {
      results = results.filter((c) => c.parentId === filters.parentId);
    }

    return results.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    );
  }

  async delete(id: EntityId): Promise<void> {
    this.categories.delete(id);
  }

  async unassignFromAllTasks(categoryId: EntityId): Promise<void> {
    for (const [, catSet] of this.taskCategories) {
      catSet.delete(categoryId);
    }
  }

  async reassignTasks(fromCategoryId: EntityId, toCategoryId: EntityId): Promise<void> {
    for (const [, catSet] of this.taskCategories) {
      if (catSet.has(fromCategoryId)) {
        catSet.delete(fromCategoryId);
        catSet.add(toCategoryId);
      }
    }
  }

  // ─── Utilidades de test ────────────────────────────────────────────────────

  /** Asigna una categoría a una tarea (simula la tabla task_categories). */
  assignCategoryToTask(taskId: string, categoryId: string): void {
    if (!this.taskCategories.has(taskId)) {
      this.taskCategories.set(taskId, new Set());
    }
    this.taskCategories.get(taskId)!.add(categoryId);
  }

  /** Devuelve todas las categorías almacenadas. */
  getAll(): Category[] {
    return [...this.categories.values()];
  }

  /** Devuelve las categorías asignadas a una tarea. */
  getCategoriesForTask(taskId: string): string[] {
    return [...(this.taskCategories.get(taskId) ?? [])];
  }
}
