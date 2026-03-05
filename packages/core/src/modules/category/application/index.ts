/**
 * API pública del módulo Category.
 * SOLO se exportan UseCases, DTOs y contratos necesarios para el exterior.
 * No exportar entidades de dominio ni implementaciones de infraestructura.
 */

// ─── UseCases ───────────────────────────────────────────────────────────────
export { CreateCategory } from "./usecases/CreateCategory";
export { UpdateCategory } from "./usecases/UpdateCategory";
export { DeleteCategory } from "./usecases/DeleteCategory";
export { ListCategories } from "./usecases/ListCategories";

// ─── DTOs (contratos de datos) ───────────────────────────────────────────────
export type {
  CategoryDTO,
  CreateCategoryInput,
  UpdateCategoryInput,
  DeleteCategoryInput,
  ListCategoriesInput,
} from "./dtos/CategoryDTO";

// ─── Contrato del repositorio (necesario para el Composition Root) ───────────
export type { ICategoryRepository } from "../infrastructure/persistence/CategoryRepository";

// ─── Implementación SQLite (solo para el Composition Root) ───────────────────
export { CategorySqliteRepository } from "../infrastructure/persistence/sqlite/CategorySqliteRepository";
