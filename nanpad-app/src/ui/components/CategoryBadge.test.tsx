/**
 * Tests del badge de categoría.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryBadge } from "./CategoryBadge";

const category = {
  id: "cat-1",
  name: "Frontend",
  color: "var(--color-accent)",
  icon: null as string | null,
  parentId: null,
  sortOrder: 0,
  createdAt: "",
  updatedAt: "",
};

describe("CategoryBadge", () => {
  it("renderiza el nombre de la categoría", () => {
    render(<CategoryBadge category={category} />);
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("sin onClick renderiza un span", () => {
    const { container } = render(<CategoryBadge category={category} />);
    const span = container.querySelector("span");
    expect(span).toBeInTheDocument();
    expect(span).toHaveTextContent("Frontend");
  });

  it("con onClick renderiza un button", () => {
    const onClick = vi.fn();
    render(<CategoryBadge category={category} onClick={onClick} />);
    const btn = screen.getByRole("button", { name: "Frontend" });
    expect(btn).toBeInTheDocument();
  });

  it("al hacer click en el botón llama onClick", () => {
    const onClick = vi.fn();
    render(<CategoryBadge category={category} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Frontend" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("con compact aplica estilos más pequeños (clase o estilo)", () => {
    const { container } = render(
      <CategoryBadge category={category} compact />
    );
    const el = container.firstChild as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el?.style?.fontSize).toBe("11px");
  });
});
