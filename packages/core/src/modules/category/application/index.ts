/**
 * API pública del módulo Category.
 * SOLO se exportan UseCases, DTOs y contratos necesarios para el exterior.
 * No exportar entidades de dominio ni implementaciones de infraestructura.
 */

// ─── UseCases ───────────────────────────────────────────────────────────────
export { CreateCategory } from "./usecases/CreateCategory.ts";
export { UpdateCategory } from "./usecases/UpdateCategory.ts";
export { DeleteCategory } from "./usecases/DeleteCategory.ts";
export { ListCategories } from "./usecases/ListCategories.ts";

// ─── DTOs (contratos de datos) ───────────────────────────────────────────────
export type {
  CategoryDTO,
  CreateCategoryInput,
  UpdateCategoryInput,
  DeleteCategoryInput,
  ListCategoriesInput,
} from "./dtos/CategoryDTO.ts";

// ─── Contrato del repositorio (necesario para el Composition Root) ───────────
export type { ICategoryRepository } from "../infrastructure/persistence/CategoryRepository.ts";

// ─── Implementación SQLite (solo para el Composition Root) ───────────────────
export { CategorySqliteRepository } from "../infrastructure/persistence/sqlite/CategorySqliteRepository.ts";
