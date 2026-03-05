/**
 * Implementación del repositorio de categorías sobre IDatabase.
 * No importa nada de Tauri — recibe IDatabase por inyección.
 */

import type { IDatabase } from "@infra/db/IDatabase";
import type { ICategoryRepository, CategoryFilters } from "../CategoryRepository";
import { Category } from "../../../domain/entities/Category";
import type { CategoryRow } from "@infra/db/schema";
import type { EntityId } from "@shared/types/id";

/**
 * Repositorio de categorías que opera sobre cualquier implementación de IDatabase.
 * Recibe la instancia por inyección desde el Composition Root.
 */
export class CategorySqliteRepository implements ICategoryRepository {
  constructor(private readonly db: IDatabase) {}

  async save(category: Category): Promise<void> {
    const existing = await this.db.select<CategoryRow[]>(
      "SELECT id FROM categories WHERE id = $1",
      [category.id]
    );

    if (existing.length === 0) {
      await this.db.execute(
        `INSERT INTO categories (id, name, parent_id, color, icon, sort_order, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          category.id,
          category.name,
          category.parentId,
          category.color,
          category.icon,
          category.sortOrder,
          category.createdAt.toISOString(),
          category.updatedAt.toISOString(),
        ]
      );
    } else {
      await this.db.execute(
        `UPDATE categories
         SET name=$1, parent_id=$2, color=$3, icon=$4, sort_order=$5, updated_at=$6
         WHERE id=$7`,
        [
          category.name,
          category.parentId,
          category.color,
          category.icon,
          category.sortOrder,
          category.updatedAt.toISOString(),
          category.id,
        ]
      );
    }
  }

  async findById(id: EntityId): Promise<Category | null> {
    const rows = await this.db.select<CategoryRow[]>(
      "SELECT * FROM categories WHERE id = $1",
      [id]
    );
    if (rows.length === 0) return null;
    return rowToCategory(rows[0]);
  }

  async findAll(filters?: CategoryFilters): Promise<Category[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters?.parentId !== undefined) {
      if (filters.parentId === null) {
        conditions.push("parent_id IS NULL");
      } else {
        conditions.push(`parent_id = $${paramIdx}`);
        // eslint-disable-next-line no-useless-assignment -- paramIdx se usa en siguientes condiciones y en la query
        paramIdx += 1;
        params.push(filters.parentId);
      }
    }

    let sql = "SELECT * FROM categories";
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY sort_order ASC, name ASC";

    const rows = await this.db.select<CategoryRow[]>(sql, params);
    return rows.map(rowToCategory);
  }

  async delete(id: EntityId): Promise<void> {
    await this.db.execute("DELETE FROM categories WHERE id = $1", [id]);
  }

  async unassignFromAllTasks(categoryId: EntityId): Promise<void> {
    await this.db.execute(
      "DELETE FROM task_categories WHERE category_id = $1",
      [categoryId]
    );
  }

  async reassignTasks(fromCategoryId: EntityId, toCategoryId: EntityId): Promise<void> {
    // Actualiza las relaciones task_categories sin duplicar:
    // 1. Inserta las nuevas relaciones (ignorando duplicados por la PK compuesta)
    await this.db.execute(
      `INSERT OR IGNORE INTO task_categories (task_id, category_id)
       SELECT task_id, $1 FROM task_categories WHERE category_id = $2`,
      [toCategoryId, fromCategoryId]
    );
    // 2. Elimina las relaciones originales
    await this.db.execute(
      "DELETE FROM task_categories WHERE category_id = $1",
      [fromCategoryId]
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToCategory(row: CategoryRow): Category {
  return Category.reconstitute({
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}
