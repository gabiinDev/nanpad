/**
 * Entidad de dominio Category.
 * Soporta jerarquía opcional mediante parent_id.
 * Inmutable externamente; los métodos retornan nuevas instancias.
 */

import { generateId, type EntityId } from "@shared/types/id.ts";

/** Props para reconstruir una Category desde persistencia. */
export interface CategoryProps {
  id: EntityId;
  name: string;
  parentId: EntityId | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Datos mínimos para crear una nueva Category. */
export interface CreateCategoryProps {
  name: string;
  parentId?: EntityId | null;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

/**
 * Entidad Category.
 * Representa una categoría que puede agrupar tareas en árbol de jerarquía.
 */
export class Category {
  readonly id: EntityId;
  readonly name: string;
  readonly parentId: EntityId | null;
  readonly color: string | null;
  readonly icon: string | null;
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: CategoryProps) {
    this.id = props.id;
    this.name = props.name;
    this.parentId = props.parentId;
    this.color = props.color;
    this.icon = props.icon;
    this.sortOrder = props.sortOrder;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Crea una nueva Category con valores por defecto.
   * @param props - Datos mínimos de la categoría.
   * @returns Nueva instancia de Category con ID generado.
   * @throws {Error} Si el nombre está vacío.
   */
  static create(props: CreateCategoryProps): Category {
    const name = props.name.trim();
    if (!name) throw new Error("[Category] El nombre no puede estar vacío.");

    const now = new Date();
    return new Category({
      id: generateId(),
      name,
      parentId: props.parentId ?? null,
      color: props.color ?? null,
      icon: props.icon ?? null,
      sortOrder: props.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstruye una Category desde los datos de persistencia.
   * @param props - Props completos desde el repositorio.
   */
  static reconstitute(props: CategoryProps): Category {
    return new Category(props);
  }

  /**
   * Retorna una nueva Category con los campos actualizados.
   * @param changes - Campos a modificar.
   * @throws {Error} Si el nombre resultante está vacío.
   */
  update(
    changes: Partial<
      Pick<CategoryProps, "name" | "parentId" | "color" | "icon" | "sortOrder">
    >
  ): Category {
    const newName = (changes.name ?? this.name).trim();
    if (!newName) throw new Error("[Category] El nombre no puede estar vacío.");

    return new Category({
      id: this.id,
      name: newName,
      parentId:
        changes.parentId !== undefined ? changes.parentId : this.parentId,
      color: changes.color !== undefined ? changes.color : this.color,
      icon: changes.icon !== undefined ? changes.icon : this.icon,
      sortOrder: changes.sortOrder ?? this.sortOrder,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  /** Indica si la categoría es raíz (sin padre). */
  get isRoot(): boolean {
    return this.parentId === null;
  }
}
