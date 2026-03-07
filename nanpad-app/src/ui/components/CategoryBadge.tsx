/**
 * Badge de categoría — tag/badge reutilizable en tareas, filtros, etc.
 */

import type { CategoryDTO } from "@nanpad/core";

const DEFAULT_COLOR = "var(--color-accent)";

/**
 * - "always": siempre muestra el color de la categoría.
 * - "filter": si activeFilterId está definido, solo el activo tiene color; el resto neutro. Si no hay filtro, todos con color.
 * - "selection": solo los seleccionados (active=true) muestran color; el resto neutro.
 */
export type CategoryBadgeColorMode = "always" | "filter" | "selection";

interface CategoryBadgeProps {
  category: CategoryDTO;
  /** Si es clickeable (filtro o selector). */
  active?: boolean;
  onClick?: () => void;
  /** Tamaño más compacto. */
  compact?: boolean;
  /**
   * Modo de color: "always" siempre con color; "filter" neutro si hay filtro y no es activo;
   * "selection" neutro si no está seleccionado.
   */
  colorMode?: CategoryBadgeColorMode;
  /** Solo para colorMode="filter": id del filtro activo. Si no hay, todos muestran color. */
  activeFilterId?: string | null;
}

export function CategoryBadge({
  category,
  active,
  onClick,
  compact,
  colorMode = "always",
  activeFilterId,
}: CategoryBadgeProps) {
  const color = (category.color && category.color.trim()) ? category.color.trim() : DEFAULT_COLOR;

  const useColor =
    colorMode === "always"
      ? true
      : colorMode === "filter"
        ? !activeFilterId || active
        : colorMode === "selection"
          ? active
          : true;

  const baseStyle: React.CSSProperties = {
    fontSize: compact ? "11px" : "12px",
    fontWeight: 500,
    color: useColor ? color : "var(--color-text-secondary)",
    background: useColor
      ? `color-mix(in oklch, ${color} 15%, transparent)`
      : "var(--color-surface-active)",
    border: `1px solid ${useColor ? `color-mix(in oklch, ${color} 40%, transparent)` : "var(--color-border)"}`,
    borderRadius: "5px",
    padding: compact ? "1px 6px" : "2px 8px",
    whiteSpace: "nowrap",
  };

  const Wrapper = onClick ? "button" : "span";
  const wrapperProps = onClick
    ? {
        type: "button" as const,
        onClick,
        style: { ...baseStyle, cursor: "pointer" },
      }
    : { style: baseStyle };

  return <Wrapper {...wrapperProps}>{category.name}</Wrapper>;
}
